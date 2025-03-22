
import { protocolList } from '../Debank.js';

export async function searchCommand(chainId, name) {
  const protocols = await protocolList(chainId);
  const regex = new RegExp(name, 'i');
  
  const matches = protocols.filter(protocol => regex.test(protocol.name));
  
  if (matches.length === 0) {
    console.log(`No protocols found matching "${name}" on chain "${chainId}"`);
    return;
  }

  console.log(`Found ${matches.length} matching protocols:`);
  matches.forEach(protocol => {
    console.log(`- ${protocol.name} (${protocol.id})`);
  });
}
