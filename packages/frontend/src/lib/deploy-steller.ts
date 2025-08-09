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
  // Extract hash from response
  const wasmHash = response?.returnValue?.xdr?.wasmHash?.toString('base64');
  if (!wasmHash) {
    logger.info("Failed to get wasm hash from upload response");
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
    logger.info("Failed to get deploy response");
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
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
  }



  //Ahmads edit to match v14
  // // Prepare and sign the transaction
  // const preparedTx = await server.prepareTransaction(transaction);
  // preparedTx.sign(deployer);


  transaction.sign(deployer);

  logger.info("Submitting transaction...");
  // let response = await server.sendTransaction(preparedTx);
  let response = await server.sendTransaction(transaction);
  if (response.errorResult) {
    logger.error("Transaction failed.", response.errorResult);
    return;
  }
  logger.info(`Transaction response: ${response}`);




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
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (getResponse?.status === "SUCCESS") {
    logger.info("Transaction successful.");
    return getResponse;
  } else {
    logger.error("Transaction failed.", getResponse);
    throw new Error("Transaction failed");
  }



  // let getResponse;

  // // Set a maximum timeout in case it never confirms
  // let attempts = 0;
  // const maxAttempts = 30; // 30 seconds timeout

  // while (attempts < maxAttempts) {
  //   attempts++;
  //   try {
  //     getResponse = await server.getTransaction(hash);
  //     if (getResponse.status !== "NOT_FOUND") {
  //       break;
  //     }
  //   } catch (error) {
  //     // If there's an error getting the transaction, wait and try again
  //     logger.info(`Waiting for confirmation... (<span class="ka tex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mrow><mi>a</mi><mi>t</mi><mi>t</mi><mi>e</mi><mi>m</mi><mi>p</mi><mi>t</mi><mi>s</mi></mrow><mi mathvariant="normal">/</mi></mrow><annotation encoding="application/x-tex">{attempts}/</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord"><span class="mord mathnormal">a</span><span class="mord mathnormal">tt</span><span class="mord mathnormal">e</span><span class="mord mathnormal">m</span><span class="mord mathnormal">pt</span><span class="mord mathnormal">s</span></span><span class="mord">/</span></span></span></span>{maxAttempts})`);
  //   }
  //   await new Promise((resolve) => setTimeout(resolve, 1000));
  // }

  // // Check if we have a response
  // if (!getResponse || attempts >= maxAttempts) {
  //   logger.info("Transaction confirmation timed out.");
  //   // Return response anyway to allow processing to continue
  //   return response;
  // }

  // if (getResponse.status === "SUCCESS") {
  //   logger.info("Transaction successful.");
  //   return getResponse;
  // } else {
  //   logger.info("Transaction failed.");
  //   throw new Error("Transaction failed");
  // }







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
// import { logger } from "@/state/utils";
// import { signTransaction } from "@stellar/freighter-api";
// import { Server } from "@stellar/stellar-sdk/rpc";
// import {
//   Account,
//   Address,
//   BASE_FEE,
//   Keypair,
//   Networks,
//   Operation,
//   StrKey,
//   Transaction,
//   TransactionBuilder,
//   xdr,
// } from "@stellar/stellar-sdk";
// import { networkRpc } from "./web3";

// export function xdrToTransaction(signedTxXdr: string, networkPassphrase: string) {
//   return new Transaction(signedTxXdr, networkPassphrase);
// }

// async function uploadWasm(contract: Buffer, deployer: Keypair, network: Networks, server: Server) {
//   const account = await server.getAccount(deployer.publicKey());
//   const operation = Operation.uploadContractWasm({ wasm: contract });
//   return await buildAndSendTransaction(account, operation, network, server, deployer);
// }

// async function deployContract(
//   response: any,
//   deployer: Keypair,
//   network: Networks,
//   server: Server
// ) {
//   const account = await server.getAccount(deployer.publicKey());

//   // Extract hash from upload response
//   const wasmHash = response?.returnValue?.xdr?.wasmHash?.toString("base64");
//   if (!wasmHash) {
//     logger.info("Failed to get wasm hash from upload response");
//     throw new Error("Failed to get wasm hash from upload response");
//   }

//   const operation = Operation.createCustomContract({
//     wasmHash: Buffer.from(wasmHash, "base64"),
//     address: Address.fromString(deployer.publicKey()),
//     salt: Buffer.from(response?.hash || "", "hex"),
//   });

//   const responseDeploy = await buildAndSendTransaction(account, operation, network, server, deployer);

//   if (!responseDeploy?.returnValue) {
//     logger.info("Failed to get deploy response");
//     throw new Error("Failed to get deploy response");
//   }

//   let contractAddress: string;
//   try {
//     const scAddress = responseDeploy.returnValue.value() as xdr.ScAddress;
//     const contractIdHash = scAddress.contractId();

//     let rawBytes: Buffer;

//     if (typeof (contractIdHash as any).toXDR === "function") {
//       // It's an xdr.Hash
//       rawBytes = Buffer.from((contractIdHash as any).toXDR());
//     } else {
//       // Already a Buffer
//       rawBytes = Buffer.from(contractIdHash);
//     }

//     contractAddress = StrKey.encodeContract(rawBytes);

//   } catch (error) {
//     logger.error("Error extracting contract address from response:", error);
//     throw new Error("Failed to extract contract address from response");
//   }

//   return contractAddress;
// }

// export async function buildAndSendTransaction(
//   account: Account,
//   operations: xdr.Operation,
//   network: Networks,
//   server: Server,
//   deployer: Keypair
// ) {
//   const transaction = new TransactionBuilder(account, {
//     fee: BASE_FEE,
//     networkPassphrase: network,
//   })
//     .addOperation(operations)
//     .setTimeout(30)
//     .build();

//   // Simulate first
//   const simulation = await server.simulateTransaction(transaction);
//   if ("error" in simulation) {
//     throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
//   }

//   transaction.sign(deployer);

//   logger.info("Submitting transaction...");
//   const sendResp = await server.sendTransaction(transaction);

//   if ("errorResultXdr" in sendResp) {
//     logger.error("Transaction failed:", sendResp.errorResultXdr);
//     throw new Error("Transaction submission failed");
//   }

//   logger.info(`Transaction hash: ${sendResp.hash}`);
//   logger.info("Awaiting confirmation...");

//   let statusResp:
//     | Awaited<ReturnType<typeof server.getTransaction>>
//     | undefined;

//   for (let i = 0; i < 20; i++) {
//     statusResp = await server.getTransaction(sendResp.hash);
//     if (statusResp.status !== "NOT_FOUND") break;
//     await new Promise((resolve) => setTimeout(resolve, 2000));
//   }

//   if (!statusResp) {
//     throw new Error("No transaction status received after polling");
//   }

//   if (statusResp.status === "SUCCESS") {
//     logger.info("Transaction successful.");
//     return statusResp;
//   } else {
//     logger.info("Transaction failed.");
//     throw new Error(`Transaction failed with status: ${statusResp.status}`);
//   }
// }

// async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
//   try {
//     logger.info("Starting Contract Deployment to Stellar Network...");
//     const server = new Server(networkRpc[network]);
//     await server.requestAirdrop(deployer.publicKey());

//     let uploadResponse = await uploadWasm(contract, deployer, network, server);
//     const address = await deployContract(uploadResponse, deployer, network, server);

//     if (address) {
//       logger.info(`Contract deployed successfully at address: ${address}`);
//     }

//     return address;
//   } catch (error) {
//     logger.error(`Error deploying contract: ${error}`, error);
//   }
// }

// export default deployStellerContract;
