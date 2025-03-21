import sortBy from 'sort-by';
import discordClient from './src/Discord.js';
import { Row } from './src/Row.js';

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
  });