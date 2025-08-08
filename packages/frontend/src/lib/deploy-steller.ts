import { logger } from "@/state/utils";
import { signTransaction } from "@stellar/freighter-api";
import { Server } from "@stellar/stellar-sdk/rpc";
import {
  Account,
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { networkRpc } from "./web3";

export function xdrToTransaction(signedTxXdr: string, networkPassphrase: string) {
  const tx = new Transaction(signedTxXdr, networkPassphrase);
  return tx;
}

async function uploadWasm(contract: Buffer, deployer: Keypair, network: Networks, server: Server) {
  const account = await server.getAccount(deployer.publicKey());
  const operation = Operation.uploadContractWasm({ wasm: contract });
  return await buildAndSendTransaction(account, operation, network, server, deployer);
}
async function deployContract(
  response: any,
  deployer: Keypair,
  network: Networks,
  server: Server,
) {
  const account = await server.getAccount(deployer.publicKey());
  // Extract hash from response
  const wasmHash = response?.returnValue?.xdr?.wasmHash?.toString('base64');
  if (!wasmHash) {
    throw new Error('Failed to get wasm hash from upload response');
  }

  const operation = Operation.createCustomContract({
    wasmHash: Buffer.from(wasmHash, 'base64'),
    address: Address.fromString(deployer.publicKey()),
    salt: Buffer.from(response?.hash || '', 'hex')
  });

  const responseDeploy = await buildAndSendTransaction(account, operation, network, server, deployer);

  // Extract contract ID from response and encode it
  if (!responseDeploy?.returnValue) {
    throw new Error('Failed to get deploy response');
  }

  let contractAddress: string;
  try {
    // In v14, we need to handle the ScVal directly
    const scAddress = responseDeploy.returnValue.value() as xdr.ScAddress;
    const contractIdHash = scAddress.contractId();

    // Convert the Hash directly to bytes array
    const contractIdArray = Array.from(contractIdHash).map(Number);
    const contractIdBuffer = Buffer.from(contractIdArray);

    // Encode the contract address
    contractAddress = StrKey.encodeContract(contractIdBuffer);
  } catch (error) {
    console.error('Error extracting contract address:', error);
    throw new Error('Failed to extract contract address from response');
  }

  return contractAddress;


}
export async function buildAndSendTransaction(
  account: Account,
  operations: xdr.Operation,
  network: Networks,
  server: Server,
  deployer: Keypair,
) {
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(operations)
    .setTimeout(30)
    .build();

  // Simulate the transaction first
  const simulation = await server.simulateTransaction(transaction);
  if ('error' in simulation) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
  }

  // Prepare and sign the transaction
  const preparedTx = await server.prepareTransaction(transaction);
  preparedTx.sign(deployer);

  logger.info("Submitting transaction...");
  let response = await server.sendTransaction(preparedTx);

  const hash = response.hash;
  logger.info(`Transaction hash: ${hash}`);
  logger.info("Awaiting confirmation...");

  let getResponse;

  while (true) {
    getResponse = await server.getTransaction(hash);
    if (getResponse.status !== "NOT_FOUND") {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (getResponse.status === "SUCCESS") {
    logger.info("Transaction successful.");
    return getResponse;
  } else {
    logger.error("Transaction failed.");
    throw new Error("Transaction failed");
  }
}

async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
  try {
    logger.info("Starting Contract Deployment to Steller Network...");
    const server = new Server(networkRpc[network]);
    await server.requestAirdrop(deployer.publicKey());
    logger.info(`Got airdrop address: ${deployer.publicKey()}`);
    let uploadResponse = await uploadWasm(contract, deployer, network, server);
    const address = await deployContract(uploadResponse, deployer, network, server);

    return address;
  } catch (error) {
    console.error(error);
  }
}

export default deployStellerContract;

// export async function submitSignedXdr(signedTxXdr: string) {
//   const tx = xdrToTransaction(signedTxXdr, network);

//   console.log("Submitting transaction...");
//   let response = await server.sendTransaction(tx);
//   const hash = response.hash;
//   console.log(`Transaction hash: ${hash}`);
//   console.log("Awaiting confirmation...");

//   let getResponse;

//   while (true) {
//     getResponse = await server.getTransaction(hash);
//     if (getResponse.status !== "NOT_FOUND") {
//       break;
//     }
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }

//   if (getResponse.status === "SUCCESS") {
//     console.log("Transaction successful.");
//     return getResponse;
//   } else {
//     console.log("Transaction failed.");
//     throw new Error("Transaction failed");
//   }
// }
