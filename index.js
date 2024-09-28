import sortBy from 'sort-by';
import { Client, GatewayIntentBits } from 'discord.js';

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

async function notify(message) {
  await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID)
    .then(channel => channel.send(`\`\`\`>> Debank Portfolio\n===\n${message}\`\`\``));
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

async function main() {
  const portfolio = await totalBalance(process.env.WALLET_ADDRESS);

  const lines = [
    `Total: ${portfolio.total_usd_value.toFixed(2)} USD`,
    '',
  ];
  
  portfolio.chain_list.slice(0, 5).forEach(chain => {
    lines.push(`${chain.name}: ${chain.usd_value.toFixed(2)} USD`);
  });

  console.log(lines);

  await notify(lines.join('\n'));
}

discord.once('ready', async () => {
  console.log(`Logged in as ${discord.user.tag}!`);

  // run the program code
  await main();

  // need to do this to let the process end
  discord.destroy();
});

discord.on('error', console.error);

await discord.login(process.env.DISCORD_APP_TOKEN);