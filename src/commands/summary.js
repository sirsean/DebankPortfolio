
import { Row } from '../Row.js';
import { totalBalance, protocolBalance, sumPortfolioBalances } from '../Debank.js';
import discordClient from '../Discord.js';

export async function summaryCommand() {
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
  
  const morpho = await Promise.all([
    protocolBalance(process.env.WALLET_ADDRESS, 'morphoblue'),
    protocolBalance(process.env.WALLET_ADDRESS, 'base_morphoblue'),
  ]).then(sumPortfolioBalances);
  const morphoRow = new Row({ name: 'Morpho', usd: morpho.usd });
  lines.push(morphoRow.renderLine());
  await morphoRow.publish();

  console.log();
  await discordClient.notify(lines.join('\n'));
}
