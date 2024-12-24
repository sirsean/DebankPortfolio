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

async function protocolList(chainId) {
  return debankFetch(`/v1/protocol/list?chain_id=${chainId}`)
    .then(res => res);
}

async function protocolBalance(id, protocolId) {
  return debankFetch(`/v1/user/protocol?id=${id}&protocol_id=${protocolId}`)
    .then(res => {
      const usd = res.portfolio_item_list.reduce((acc, cur) => acc + cur.stats.net_usd_value, 0);
      const eth = res.portfolio_item_list
        .map(item => item.asset_token_list.filter(token => token.name == 'ETH').reduce((acc, cur) => acc + cur.amount, 0))
        .reduce((acc, cur) => acc + cur, 0);
      return { usd, eth };
    });
}

function sumPortfolioBalances(balances) {
  return balances.reduce((acc, cur) => {
    return {
      usd: acc.usd + cur.usd,
      eth: acc.eth + cur.eth,
    };
  }, { usd: 0, eth: 0 });
}

class Row {
  constructor({ name, usd, eth, date }) {
    this.name = name;
    this.usd = usd;
    this.eth = eth;
    this.date = date || new Date();
  }

  renderLine() {
    if (this.eth !== undefined) {
      return `${this.name}: ${this.eth.toFixed(6)} ETH`;
    } else {
      return `${this.name}: ${this.usd.toFixed(2)} USD`;
    }
  }

  async publish() {
    if (process.env.NODE_ENV == 'development') {
      return this.print();
    } else {
      return this.publishToNotion();
    }
  }

  async print() {
    const values = [];
    if (this.usd !== undefined) {
      values.push(`${this.usd} USD`);
    }
    if (this.eth !== undefined) {
      values.push(`${this.eth} ETH`);
    }
    console.log(this.name, values.join(', '), this.date);
  }

  async publishToNotion() {
    const properties = {
      "Name": {
        "title": [{
          "text": { "content": this.name },
        }],
      },
      "USD": {
        "number": this.usd,
      },
      "Date": {
        "date": { "start": this.date.toISOString().split('T')[0] },
      },
    };
    if (this.eth !== undefined) {
      properties["ETH"] = {
        "number": this.eth,
      };
    }
    return notionClient.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties,
    });
  }
}

async function main() {
  const portfolio = await totalBalance(process.env.WALLET_ADDRESS);

  const lines = [];

  const row = new Row({ name: 'Total', usd: portfolio.total_usd_value });
  lines.push(row.renderLine());
  await row.publish();

  lines.push('');

  portfolio.chain_list.slice(0, 5).forEach(async (chain) => {
    const row = new Row({ name: chain.name, usd: chain.usd_value });
    lines.push(row.renderLine());
    await row.publish();
  });

  lines.push('');

  const resolv = await protocolBalance(process.env.WALLET_ADDRESS, 'resolv');
  const resolvRow = new Row({ name: 'Resolv', usd: resolv.usd });
  lines.push(resolvRow.renderLine());
  await resolvRow.publish();

  const tokemak = await Promise.all([
    protocolBalance(process.env.WALLET_ADDRESS, 'tokemak'),
    protocolBalance(process.env.WALLET_ADDRESS, 'base_tokemak'),
  ]).then(sumPortfolioBalances);
  const tokemakRow = new Row({ name: 'Tokemak', usd: tokemak.usd, eth: tokemak.eth });
  lines.push(tokemakRow.renderLine());
  await tokemakRow.publish();

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