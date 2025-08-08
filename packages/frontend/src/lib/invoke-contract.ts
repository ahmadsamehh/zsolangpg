import { BASE_FEE, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { networkRpc } from "./web3";
import { isValidJSON } from "./utils";

function buildOperation({
  contractId,
  method,
  args,
}: {
  method: string;
  contractId: string;
  args: { type: string; value: string; subType: string }[];
}) {
  const contract = new Contract(contractId);

  const scArgs = args.map(({ type, value, subType }) => {
    if (type === "vec") {
      if (!isValidJSON(value) || !Array.isArray(JSON.parse(value))) {
        throw new Error(`Invalid argument provided "${value}". Please provide a valid array of ${subType}`);
      }
      value = JSON.parse(value).map((x: any) => {
        try {
          return nativeToScVal(x, { type: subType });
        } catch (error) {
          throw new Error(`Invalid argument provided "${x}". Please provide a valid ${subType}`);
        }
      });
    }
    try {
      return nativeToScVal(value, { type });
    } catch (error) {
      throw new Error(`Invalid argument provided "${value}". Please provide a valid ${type}`);
    }
  });
  const operation = contract.call(method, ...scArgs);
  return operation;
}

export async function invokeContract({
  contractId,
  method,
  args,
}: {
  method: string;
  contractId: string;
  args: { type: string; value: string; subType: string }[];
}) {
  const sourceKeypair = Keypair.random();
  const rpcUrl = networkRpc[Networks.TESTNET];
  const server = new Server(rpcUrl);
  const sourcePublicKey = sourceKeypair.publicKey();
  await server.requestAirdrop(sourcePublicKey);
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const operation = buildOperation({ contractId, method, args });
  // Build the initial transaction
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate the transaction to check for potential issues
  try {
    const simulation = await server.simulateTransaction(transaction);

    if ('error' in simulation) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulation.error)}`);
    }

    // Set minimum fee from simulation if available
    if ('minResourceFee' in simulation) {
      const minFee = parseInt(simulation.minResourceFee);
      const baseFee = parseInt(BASE_FEE);
      if (!isNaN(minFee) && !isNaN(baseFee)) {
        transaction.fee = minFee > baseFee ? minFee.toString() : BASE_FEE;
      }
    }

  } catch (e) {
    console.error("Transaction simulation failed:", e);
    throw e;
  }

  // Prepare the transaction
  const preparedTx = await server.prepareTransaction(transaction);

  // Add the signature
  preparedTx.sign(sourceKeypair);

  // Send the transaction
  const txResult = await server.sendTransaction(preparedTx);
  return txResult;
}
