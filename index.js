
import { Command } from 'commander';
import discordClient from './src/Discord.js';
import { Row } from './src/Row.js';
import { totalBalance, protocolBalance, sumPortfolioBalances, protocolList } from './src/Debank.js';

async function summaryCommand() {
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

async function main() {
  const program = new Command();

  program
    .name('debank-portfolio')
    .description('CLI to monitor Debank portfolio')
    .version('1.0.0');

  program
    .command('summary')
    .description('Show portfolio summary')
    .action(async () => {
      await discordClient.initialize('Debank Portfolio')
        .then(initialized => {
          if (!initialized) {
            console.warn('Discord client failed to initialize. Notifications will be logged to console only.');
          }
          return summaryCommand();
        })
        .catch(e => {
          console.error(e);
          discordClient.notify(e.message);
        })
        .finally(() => {
          discordClient.destroy();
        });
    });

  await program.parseAsync();
}

main();
