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
//   const tx = new Transaction(signedTxXdr, networkPassphrase);
//   return tx;
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
//   server: Server,
// ) {
//   const account = await server.getAccount(deployer.publicKey());
//   logger.info(` Account : ${account}`);
//   // Extract hash from response
//   const wasmHash = response?.returnValue?.xdr?.wasmHash?.toString('base64');
//   logger.info(`Wasm Hash: ${wasmHash}`);
//   if (!wasmHash) {
//     throw new Error('Failed to get wasm hash from upload response');
//   }

//   const operation = Operation.createCustomContract({
//     wasmHash: Buffer.from(wasmHash, 'base64'),
//     address: Address.fromString(deployer.publicKey()),
//     salt: Buffer.from(response?.hash || '', 'hex')
//   });

//   const responseDeploy = await buildAndSendTransaction(account, operation, network, server, deployer);

//   // Extract contract ID from response and encode it
//   if (!responseDeploy?.returnValue) {
//     throw new Error('Failed to get deploy response');
//   }

//   let contractAddress: string;
//   try {
//     // In v14, we need to handle the ScVal directly
//     const scAddress = responseDeploy.returnValue.value() as xdr.ScAddress;
//     const contractIdHash = scAddress.contractId();

//     // Convert the Hash directly to bytes array
//     const contractIdArray = Array.from(contractIdHash).map(Number);
//     const contractIdBuffer = Buffer.from(contractIdArray);

//     // Encode the contract address
//     contractAddress = StrKey.encodeContract(contractIdBuffer);
//   } catch (error) {
//     console.error('Error extracting contract address:', error);
//     throw new Error('Failed to extract contract address from response');
//   }

//   return contractAddress;


// }
// export async function buildAndSendTransaction(
//   account: Account,
//   operations: xdr.Operation,
//   network: Networks,
//   server: Server,
//   deployer: Keypair,
// ) {
//   const transaction = new TransactionBuilder(account, {
//     fee: BASE_FEE,
//     networkPassphrase: network,
//   })
//     .addOperation(operations)
//     .setTimeout(30)
//     .build();

//   // Simulate the transaction first
//   const simulation = await server.simulateTransaction(transaction);
//   if ('error' in simulation) {
//     throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
//   }

//   // Prepare and sign the transaction
//   const preparedTx = await server.prepareTransaction(transaction);
//   preparedTx.sign(deployer);

//   logger.info("Submitting transaction...");
//   let response = await server.sendTransaction(preparedTx);

//   const hash = response.hash;
//   logger.info(`Transaction hash: ${hash}`);
//   logger.info("Awaiting confirmation...");

//   let getResponse;

//   while (true) {
//     getResponse = await server.getTransaction(hash);
//     if (getResponse.status !== "NOT_FOUND") {
//       break;
//     }
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }

//   if (getResponse.status === "SUCCESS") {
//     logger.info("Transaction successful.");
//     return getResponse;
//   } else {
//     logger.error("Transaction failed.");
//     throw new Error("Transaction failed");
//   }
// }

// async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
//   try {
//     logger.info("Starting Contract Deployment to Steller Network...");
//     logger.info(`Deploying contract from buffer: ${contract}`);
//     const server = new Server(networkRpc[network]);
//     await server.requestAirdrop(deployer.publicKey());
//     logger.info(`Got airdrop address: ${deployer.publicKey()}`);
//     let uploadResponse = await uploadWasm(contract, deployer, network, server);
//     const address = await deployContract(uploadResponse, deployer, network, server);
//     if (address) {
//       logger.info(`Contract deployed successfully at address: ${address}`);
//     }

//     return address;
//   } catch (error) {
//     logger.error(`Error deploying contract: ${error}`);
//   }
// }

// export default deployStellerContract;

// // export async function submitSignedXdr(signedTxXdr: string) {
// //   const tx = xdrToTransaction(signedTxXdr, network);

// //   console.log("Submitting transaction...");
// //   let response = await server.sendTransaction(tx);
// //   const hash = response.hash;
// //   console.log(`Transaction hash: ${hash}`);
// //   console.log("Awaiting confirmation...");

// //   let getResponse;

// //   while (true) {
// //     getResponse = await server.getTransaction(hash);
// //     if (getResponse.status !== "NOT_FOUND") {
// //       break;
// //     }
// //     await new Promise((resolve) => setTimeout(resolve, 1000));
// //   }

// //   if (getResponse.status === "SUCCESS") {
// //     console.log("Transaction successful.");
// //     return getResponse;
// //   } else {
// //     console.log("Transaction failed.");
// //     throw new Error("Transaction failed");
// //   }
// // }


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
//   const tx = new Transaction(signedTxXdr, networkPassphrase);
//   return tx;
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
//   server: Server,
// ) {
//   const account = await server.getAccount(deployer.publicKey());
//   logger.info(`Account: ${account.accountId()}`);

//   // Extract hash from response - simplified approach
//   let wasmHash: Buffer;
//   try {
//     if (response?.returnValue) {
//       // Handle the ScVal return value properly
//       const returnValue = response.returnValue;
//       if (returnValue instanceof xdr.ScVal && returnValue.switch() === xdr.ScValType.scvBytes()) {
//         wasmHash = returnValue.bytes();
//       } else {
//         throw new Error('Invalid return value format');
//       }
//     } else {
//       throw new Error('No return value in upload response');
//     }
//   } catch (error) {
//     logger.error(`Error extracting wasm hash: ${error}`, error);
//     throw new Error('Failed to get wasm hash from upload response');
//   }

//   logger.info(`Wasm Hash length: ${wasmHash.length}`);

//   const operation = Operation.createCustomContract({
//     wasmHash: wasmHash,
//     address: Address.fromString(deployer.publicKey()),
//     salt: Buffer.alloc(32) // Use a proper salt instead of response hash
//   });

//   const responseDeploy = await buildAndSendTransaction(account, operation, network, server, deployer);

//   // Extract contract ID from response - simplified
//   if (!responseDeploy?.returnValue) {
//     throw new Error('Failed to get deploy response');
//   }

//   let contractAddress: string;
//   try {
//     const returnValue = responseDeploy.returnValue;
//     if (returnValue instanceof xdr.ScVal && returnValue.switch() === xdr.ScValType.scvAddress()) {
//       const scAddress = returnValue.address();
//       if (scAddress.switch() === xdr.ScAddressType.scAddressTypeContract()) {
//         const contractId = scAddress.contractId();
//         contractAddress = StrKey.encodeContract(contractId);
//       } else {
//         throw new Error('Return value is not a contract address');
//       }
//     } else {
//       throw new Error('Invalid return value type');
//     }
//   } catch (error) {
//     logger.error('Error extracting contract address:', error);
//     throw new Error('Failed to extract contract address from response');
//   }

//   return contractAddress;
// }

// // Fixed function signature - Operation instead of xdr.Operation
// export async function buildAndSendTransaction(
//   account: Account,
//   operation: Operation, // ✅ Changed from xdr.Operation to Operation
//   network: Networks,
//   server: Server,
//   deployer: Keypair,
// ) {
//   try {
//     const transaction = new TransactionBuilder(account, {
//       fee: BASE_FEE,
//       networkPassphrase: network,
//     })
//       .addOperation(operation) // ✅ Now this will work correctly
//       .setTimeout(30)
//       .build();

//     // Simulate the transaction first
//     logger.info("Simulating transaction...");
//     const simulation = await server.simulateTransaction(transaction);

//     if ('error' in simulation) {
//       logger.error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
//       throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
//     }

//     if (!simulation.result) {
//       throw new Error('Simulation returned no result');
//     }

//     logger.info("Simulation successful, preparing transaction...");

//     // Prepare and sign the transaction
//     const preparedTx = await server.prepareTransaction(transaction);

//     // Verify that preparedTx is actually a Transaction instance
//     if (!(preparedTx instanceof Transaction)) {
//       logger.error('prepareTransaction did not return a Transaction instance');
//       throw new Error('prepareTransaction returned invalid type');
//     }

//     preparedTx.sign(deployer);

//     logger.info("Submitting transaction...");
//     const response = await server.sendTransaction(preparedTx);

//     const hash = response.hash;
//     logger.info(`Transaction hash: ${hash}`);
//     logger.info("Awaiting confirmation...");

//     let getResponse;
//     let attempts = 0;
//     const maxAttempts = 30; // Maximum 30 seconds

//     while (attempts < maxAttempts) {
//       getResponse = await server.getTransaction(hash);
//       if (getResponse.status !== "NOT_FOUND") {
//         break;
//       }
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       attempts++;
//     }

//     if (!getResponse || getResponse.status === "NOT_FOUND") {
//       throw new Error('Transaction not found after waiting');
//     }

//     if (getResponse.status === "SUCCESS") {
//       logger.info("Transaction successful.");
//       return getResponse;
//     } else if (getResponse.status === "FAILED") {
//       logger.error(`Transaction failed: ${JSON.stringify(getResponse)}`);
//       throw new Error(`Transaction failed: ${getResponse.status}`);
//     } else {
//       logger.error(`Transaction status: ${getResponse.status}`);
//       throw new Error(`Transaction status: ${getResponse.status}`);
//     }
//   } catch (error) {
//     logger.error(`Error in buildAndSendTransaction: ${error}`);
//     throw error;
//   }
// }

// async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
//   try {
//     logger.info("Starting Contract Deployment to Stellar Network...");
//     logger.info(`Deploying contract from buffer with ${contract.length} bytes`);

//     const server = new Server(networkRpc[network]);

//     // Request airdrop
//     logger.info("Requesting airdrop...");
//     await server.requestAirdrop(deployer.publicKey());
//     logger.info(`Got airdrop for address: ${deployer.publicKey()}`);

//     // Wait a bit for the airdrop to be processed
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Upload WASM
//     logger.info("Uploading WASM...");
//     const uploadResponse = await uploadWasm(contract, deployer, network, server);

//     // Deploy contract
//     logger.info("Deploying contract...");
//     const address = await deployContract(uploadResponse, deployer, network, server);

//     if (address) {
//       logger.info(`Contract deployed successfully at address: ${address}`);
//       return address;
//     } else {
//       throw new Error('Deployment completed but no address returned');
//     }

//   } catch (error) {
//     logger.error(`Error deploying contract: ${error}`);
//     throw error; // Re-throw to let caller handle
//   }
// }

// export default deployStellerContract;


import { logger } from "@/state/utils";
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
import { error } from "console";

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
  uploadResponse: any,
  deployer: Keypair,
  network: Networks,
  server: Server,
) {
  const account = await server.getAccount(deployer.publicKey());
  logger.info(`Account: ${account.accountId()}`);

  // Extract hash from upload response - using current SDK v14+ approach
  if (!uploadResponse?.returnValue) {
    throw new Error('No return value in upload response');
  }

  // Get the WASM hash bytes from the upload response
  const wasmHashBytes = uploadResponse.returnValue.bytes();
  logger.info(`Wasm Hash length: ${wasmHashBytes.length} bytes`);

  // Generate a random salt (32 bytes)
  const salt = Buffer.alloc(32);
  crypto.getRandomValues(salt);

  const operation = Operation.createCustomContract({
    wasmHash: wasmHashBytes, // This is already a Buffer/Uint8Array from .bytes()
    address: Address.fromString(deployer.publicKey()),
    salt: salt
  });

  const deployResponse = await buildAndSendTransaction(account, operation, network, server, deployer);

  // Extract contract address from deploy response
  if (!deployResponse?.returnValue) {
    throw new Error('Failed to get deploy response');
  }

  let contractAddress: string;
  try {
    // In current SDK, returnValue is already an ScVal, get the address directly
    const returnValue = deployResponse.returnValue;

    if (returnValue.switch() === xdr.ScValType.scvAddress()) {
      const scAddress = returnValue.address();
      if (scAddress.switch() === xdr.ScAddressType.scAddressTypeContract()) {
        const contractIdBytes = scAddress.contractId();
        contractAddress = StrKey.encodeContract(contractIdBytes);
      } else {
        throw new Error('Return value is not a contract address');
      }
    } else {
      throw new Error('Invalid return value type - expected address');
    }
  } catch (error) {
    logger.error('Error extracting contract address:', error);
    throw new Error(`Failed to extract contract address: `);
  }

  return contractAddress;
}

// Fixed to use current SDK patterns
export async function buildAndSendTransaction(
  account: Account,
  operation: any, // Using 'any' to avoid type conflicts between SDK versions
  network: Networks,
  server: Server,
  deployer: Keypair,
) {
  try {
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: network,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    logger.info("Preparing transaction...");

    // Prepare the transaction (this handles simulation internally)
    const preparedTx = await server.prepareTransaction(transaction);

    // Sign the prepared transaction
    preparedTx.sign(deployer);

    logger.info("Submitting transaction...");
    const response = await server.sendTransaction(preparedTx);

    const hash = response.hash;
    logger.info(`Transaction hash: ${hash}`);
    logger.info("Awaiting confirmation...");

    let getResponse;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds

    while (attempts < maxAttempts) {
      getResponse = await server.getTransaction(hash);
      if (getResponse.status !== "NOT_FOUND") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!getResponse || getResponse.status === "NOT_FOUND") {
      throw new Error('Transaction not found after waiting');
    }

    if (getResponse.status === "SUCCESS") {
      logger.info("Transaction successful.");
      return getResponse;
    } else {
      logger.error(`Transaction failed with status: ${getResponse.status}`, error);
      if (getResponse.resultXdr) {
        logger.error(`Result XDR: ${getResponse.resultXdr}`, getResponse.resultXdr);
      }
      throw new Error(`Transaction failed: ${getResponse.status}`);
    }
  } catch (error) {
    logger.error(`Error in buildAndSendTransaction: `, error);
    throw error;
  }
}

async function deployStellerContract(contract: Buffer, deployer: Keypair, network: Networks) {
  try {
    logger.info("Starting Contract Deployment to Stellar Network...");
    logger.info(`Deploying contract from buffer with ${contract.length} bytes`);

    const server = new Server(networkRpc[network]);

    // Request airdrop for testnet
    if (network === Networks.TESTNET) {
      logger.info("Requesting airdrop...");
      try {
        await server.requestAirdrop(deployer.publicKey());
        logger.info(`Airdrop requested for address: ${deployer.publicKey()}`);
        // Wait for airdrop to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (airdropError) {
        logger.error(`Airdrop failed (might already have funds): `, airdropError);
      }
    }

    // Upload WASM
    logger.info("Uploading WASM bytecode...");
    const uploadResponse = await uploadWasm(contract, deployer, network, server);

    if (!uploadResponse) {
      throw new Error('WASM upload failed');
    }

    // Deploy contract instance
    logger.info("Deploying contract instance...");
    const contractAddress = await deployContract(uploadResponse, deployer, network, server);

    if (!contractAddress) {
      throw new Error('Contract deployment failed - no address returned');
    }

    logger.info(`Contract deployed successfully at address: ${contractAddress}`);
    return contractAddress;

  } catch (error) {
    logger.error(`Error deploying contract: `, error);
    logger.info("Contract deployment failed.");
    logger.info(`Contract address: undefined`);
    throw error;
  }
}

export default deployStellerContract;