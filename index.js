import sortBy from 'sort-by';
import { Client, GatewayIntentBits } from 'discord.js';
import * as notion from '@notionhq/client';

const notionClient = new notion.Client({ auth: process.env.NOTION_TOKEN });

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

async function notify(message) {
  if (process.env.NODE_ENV == 'development') {
    console.log(message);
  } else {
    await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID)
      .then(channel => channel.send(`\`\`\`>> Debank Portfolio\n===\n${message}\`\`\``));
  }
}

const DEBANK_API = 'https://pro-openapi.debank.com';

async function debankFetch(path) {
  return fetch(`${DEBANK_API}${path}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'AccessKey': process.env.DEBANK_KEY,
    }
  }).then(res => res.json());
}

async function totalBalance(id) {
  return debankFetch(`/v1/user/total_balance?id=${id}`)
    .then(res => {
      res.chain_list = res.chain_list
        .filter(c => c.usd_value > 0)
        .sort(sortBy('-usd_value'));
      return res;
    });
}

class Row {
  constructor({ name, amount, date }) {
    this.name = name;
    this.amount = amount;
    this.date = date || new Date();
  }
}

async function addRow(row) {
  return notionClient.pages.create({
    parent: {
      database_id: process.env.NOTION_DATABASE_ID,
    },
    properties: {
      "Name": {
        "title": [{
          "text": { "content": row.name },
        }],
      },
      "USD": {
        "number": row.amount,
      },
      "Date": {
        "date": { "start": row.date.toISOString().split('T')[0] },
      },
    },
  });
}

async function main() {
  const portfolio = await totalBalance(process.env.WALLET_ADDRESS);

  const lines = [
    `Total: ${portfolio.total_usd_value.toFixed(2)} USD`,
    '',
  ];
  await addRow(new Row({ name: 'Total', amount: portfolio.total_usd_value }));
  
  portfolio.chain_list.slice(0, 5).forEach(chain => {
    lines.push(`${chain.name}: ${chain.usd_value.toFixed(2)} USD`);
    addRow(new Row({ name: chain.name, amount: chain.usd_value }));
  });

  console.log(lines);

  await notify(lines.join('\n'));
}

discord.once('ready', async () => {
  console.log(`Logged in as ${discord.user.tag}!`);

  // run the program code
  await main()
    .catch(e => {
      console.error(e);
      notify(e.message);
    });

  // need to do this to let the process end
  discord.destroy();
});

discord.on('error', console.error);

await discord.login(process.env.DISCORD_APP_TOKEN);