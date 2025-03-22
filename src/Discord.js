
import { Client, GatewayIntentBits } from 'discord.js';

class Discord {
  constructor() {
    this.client = null;
    this.appName = 'watchdog notifier';
  }

  async initialize(appName) {
    try {
      if (appName) {
        this.appName = appName;
      }

      if (!process.env.DISCORD_APP_TOKEN) {
        console.error('DISCORD_APP_TOKEN is not set in environment variables');
        return false;
      }

      this.client = new Client({
        intents: [GatewayIntentBits.Guilds],
      });

      this.client.on('error', (error) => {
        console.error('Discord client error:', error.message);
      });

      await this.client.login(process.env.DISCORD_APP_TOKEN);
      console.log(`Logged in as ${this.client.user.tag}!`);
      return true;
    } catch (error) {
      console.error('Failed to initialize Discord client:', error.message);
      return false;
    }
  }

  async notify(message) {
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
      return;
    }

    try {
      if (!this.client) {
        console.error('Discord client is not ready. Token may not be set.');
        console.log(message);
        return;
      }

      if (!process.env.DISCORD_APP_TOKEN) {
        console.error('DISCORD_APP_TOKEN is not set in environment variables');
        console.log(message);
        return;
      }

      const channel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      if (!channel) {
        console.error(`Could not find Discord channel with ID: ${process.env.DISCORD_CHANNEL_ID}`);
        console.log(message);
        return;
      }

      await channel.send(`\`\`\`>> ${this.appName}\n===\n${message}\`\`\``);
    } catch (error) {
      console.error('Error sending Discord notification:', error.message);
      console.log(message);
    }
  }

  async notifyAll(messages) {
    if (!messages || messages.length === 0) {
      return;
    }

    for (const message of messages) {
      await this.notify(message);
    }
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
    }
  }
}

const discordClient = new Discord();
export default discordClient;
