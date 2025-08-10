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
import type { Api } from "@stellar/stellar-sdk/rpc";
import { stat } from "fs";


/**
 * Convert signedTxXdr -> Transaction
 */
export function xdrToTransaction(signedTxXdr: string, networkPassphrase: string) {
  const tx = new Transaction(signedTxXdr, networkPassphrase);
  return tx;
}
/**
 * uploadWasm: build and send uploadContractWasm operation
 */
async function uploadWasm(contract: Buffer, deployer: Keypair, network: Networks, server: Server) {
  const account = await server.getAccount(deployer.publicKey());
  const operation = Operation.uploadContractWasm({ wasm: contract });
  return await buildAndSendTransaction(account, operation, network, server, deployer);
}

/**
 * deployContract: createCustomContract and extract contract address
 */

async function deployContract(
  response: any,
  deployer: Keypair,
  network: Networks,
  server: Server,
) {
  const account = await server.getAccount(deployer.publicKey());
  console.log('Account retrieved:', account);

  // Extract hash from response
  const wasmHash = response?.returnValue?.xdr?.wasmHash?.toString('base64');
  if (!wasmHash) {
    logger.info("Failed to get wasm hash from upload response");
    console.error('Failed to get wasm hash from upload response:', response);

    throw new Error('Failed to get wasm hash from upload response');
  }
  console.log('WASM Hash:', wasmHash);
  logger.info(`WASM Hash: ${wasmHash}`);

  const operation = Operation.createCustomContract({
    wasmHash: Buffer.from(wasmHash, 'base64'),
    address: Address.fromString(deployer.publicKey()),
    salt: Buffer.from(response?.hash || '', 'hex')
  });

  const responseDeploy = await buildAndSendTransaction(account, operation, network, server, deployer);

  // Extract contract ID from response and encode it
  if (!responseDeploy?.returnValue) {
    logger.info("Failed to get deploy response");
    throw new Error('Failed to get deploy response');
  }
  console.log('Deploy response:', responseDeploy.resultXdr);
  logger.info(`Deploy response: ${responseDeploy.resultXdr}`);

  console.log('Return value:', responseDeploy.returnValue);
  logger.info(`Return value: ${responseDeploy.returnValue}`);

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
    logger.error("Error extracting contract address from response:", error);
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
    .setTimeout(300)
    .build();

  // Simulate the transaction first
  const simulation = await server.simulateTransaction(transaction);
  if ('error' in simulation) {

    console.error('Simulation error:', simulation.error);
    logger.info(`Simulation failed: ${JSON.stringify(simulation.error)}`);
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
  }

  // Log the successful simulation
  logger.info("Transaction simulation successful.");
  logger.info(`Simulation result: ${JSON.stringify(simulation.result)}`);

  //Ahmads edit to match v14
  // // Prepare and sign the transaction
  // const preparedTx = await server.prepareTransaction(transaction);
  // preparedTx.sign(deployer);


  transaction.sign(deployer);

  logger.info("Submitting transaction...");
  // let response = await server.sendTransaction(preparedTx);
  // let response = await server.sendTransaction(transaction);
  // if (response.errorResult) {
  //   logger.error("Transaction failed.", response.errorResult);
  //   return;
  // }
  // logger.info(`Transaction response: ${response}`);
  let response = await server.sendTransaction(transaction);

  // Check for transaction failure and log the specific reason
  if (response.status === "ERROR" && response.errorResult) {
    // The 'result' xdr contains the detailed reason for the failure.
    const errorDetails = response.errorResult.result;
    logger.error("Transaction failed with details:", JSON.stringify(errorDetails, null, 2));
    console.error("Transaction failed with details:", JSON.stringify(errorDetails, null, 2));
    console.error("Transaction failed with details:", errorDetails.toString());
    throw new Error(`Transaction failed: ${JSON.stringify(errorDetails)}`);
  }




  /////////updates to match V14
  //const hash = response.hash;
  // In SDK v14, the hash is in the response.transactionResult or response.id
  const hash = response.hash;
  logger.info(`Transaction hash: ${hash}`);
  logger.info("Awaiting confirmation...");


  let getResponse;

  // while (true) {
  //   getResponse = await server.getTransaction(hash);
  //   if (getResponse.status !== "NOT_FOUND") {
  //     break;
  //   }
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  // }
  for (let i = 0; i < 20; i++) {
    getResponse = await server.getTransaction(hash);
    if (getResponse.status !== "NOT_FOUND") {
      logger.info(`Transaction status: ${getResponse.status}`);
      console.error("Transaction diagnosticEventsXdr:", getResponse.diagnosticEventsXdr);
      logger.error("Transaction failed with details:", getResponse.resultXdr);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (getResponse?.status === "SUCCESS") {
    logger.info("Transaction successful.");
    logger.info(`Transaction result: ${getResponse.resultXdr}`);
    return getResponse;
  } else {
    logger.error("Transaction failed.", getResponse);
    throw new Error("Transaction failed");
  }
}

async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
  try {
    logger.info("Starting Contract Deployment to Steller Network...");
    logger.info(`Deploying contract from buffer: ${contract}`);
    const server = new Server(networkRpc[network]);
    await server.requestAirdrop(deployer.publicKey());
    logger.info(`Got airdrop address: ${deployer.publicKey()}`);
    let uploadResponse = await uploadWasm(contract, deployer, network, server);
    const address = await deployContract(uploadResponse, deployer, network, server);
    if (address) {
      logger.info(`Contract deployed successfully at address: ${address}`);
    }

    return address;
  } catch (error) {
    logger.error(`Error deploying contract: ${error}`, error);
  }
}

export default deployStellerContract;