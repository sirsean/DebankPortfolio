import { Command } from 'commander';
import discordClient from './src/Discord.js';
import { summaryCommand } from './src/commands/summary.js';

async function main() {
  const program = new Command();

  program
    .name('debank-portfolio')
    .description('CLI to monitor Debank portfolio')
    .version('1.0.0');

  program
    .command('summary')
    .description('Show portfolio summary')
    .action(summaryCommand);

  await program.parseAsync();
}

discordClient.initialize('Debank Portfolio')
  .then(initialized => {
    if (!initialized) {
      console.warn('Discord client failed to initialize. Notifications will be logged to console only.');
    }
    return main();
  })
  .catch(e => {
    console.error(e);
    discordClient.notify(e.message);
  })
  .finally(() => {
    discordClient.destroy();
  });