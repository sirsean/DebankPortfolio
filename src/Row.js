
import * as notion from '@notionhq/client';

const notionClient = new notion.Client({ auth: process.env.NOTION_TOKEN });

export class Row {
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
