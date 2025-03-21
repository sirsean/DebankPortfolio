
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

export async function totalBalance(id) {
  return debankFetch(`/v1/user/total_balance?id=${id}`)
    .then(res => {
      res.chain_list = res.chain_list
        .filter(c => c.usd_value > 0)
        .sort(sortBy('-usd_value'));
      return res;
    });
}

export async function protocolList(chainId) {
  return debankFetch(`/v1/protocol/list?chain_id=${chainId}`)
    .then(res => res);
}

export async function protocolBalance(id, protocolId) {
  return debankFetch(`/v1/user/protocol?id=${id}&protocol_id=${protocolId}`)
    .then(res => {
      const usd = res.portfolio_item_list.reduce((acc, cur) => acc + cur.stats.net_usd_value, 0);
      const eth = res.portfolio_item_list
        .map(item => item.asset_token_list.filter(token => token.name == 'ETH').reduce((acc, cur) => acc + cur.amount, 0))
        .reduce((acc, cur) => acc + cur, 0);
      return { usd, eth };
    });
}

export function sumPortfolioBalances(balances) {
  return balances.reduce((acc, cur) => {
    return {
      usd: acc.usd + cur.usd,
      eth: acc.eth + cur.eth,
    };
  }, { usd: 0, eth: 0 });
}
