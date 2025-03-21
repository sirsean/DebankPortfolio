import discordClient from './src/Discord.js';
import { Row } from './src/Row.js';
import { totalBalance, protocolBalance, sumPortfolioBalances } from './src/Debank.js';

async function main() {
  const discordInitialized = await discordClient.initialize();
  if (!discordInitialized) {
    console.warn('Discord client failed to initialize. Notifications will be logged to console only.');
  }
  
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

  console.log();
  await discordClient.notify(lines.join('\n'));

  // need to do this to let the process end
  discordClient.destroy();
}

// run the program code
await main()
  .catch(e => {
    console.error(e);
  })
  .finally(() => {
    discordClient.destroy();
  });