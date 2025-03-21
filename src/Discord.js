
import { Client, GatewayIntentBits } from 'discord.js';

export class Discord {
  constructor(token, channelId) {
    this.token = token;
    this.channelId = channelId;
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });
  }

  async connect() {
    await this.client.login(this.token);
    return new Promise((resolve) => {
      this.client.once('ready', () => {
        console.log(`Logged in as ${this.client.user.tag}!`);
        resolve();
      });
    });
  }

  async notify(message) {
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    } else {
      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send(`\`\`\`>> Debank Portfolio\n===\n${message}\`\`\``);
    }
  }

  async disconnect() {
    await this.client.destroy();
  }
}
