import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Address,
  Account,
  nativeToScVal,
  rpc,
  xdr,
  scValToNative,
  Asset,
  Operation,
} from "@stellar/stellar-sdk";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";

export const CONTRACT_ID = "CDPN23YABJ5OJR5LSF5647MZ3AWPBVE73GNB7DI43CVAX36ZG4FSOSRR";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// XLM native token contract on testnet
export const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// ─── Contract Helpers ─────────────────────────────────────────────────────────

export async function initializeContract(admin: string): Promise<string> {
  console.log("Initializing contract with admin:", admin);
  return callContract("initialize", [addressToScVal(admin)]);
}

export async function getStudentPool(student: string): Promise<any> {
  const address = await connectWallet();
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CONTRACT_ID);

  // For simulation, we can use a dummy Account object
  const account = new Account(address, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_pool", addressToScVal(student)))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(response) && response.result) {
    return scValToNative(response.result.retval);
  }
  throw new Error("Could not fetch student pool. Check if student is enrolled.");
}

export async function getXlmBalance(address: string): Promise<number> {
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(NATIVE_TOKEN_ID);
  const account = new Account(address, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("balance", addressToScVal(address)))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(response) && response.result) {
    return Number(scValToNative(response.result.retval)) / 10_000_000;
  }
  return 0;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
export async function connectWallet(): Promise<string> {
  console.log("Attempting to connect wallet...");
  
  if (typeof window === "undefined") {
    throw new Error("Wallet connection only available in browser.");
  }

  // We check isConnected but don't strictly block, as some browser
  // environments may have race conditions. We rely on requestAccess.
  const connection = await isConnected();
  if (connection.error) {
    console.warn("Freighter isConnected warning:", connection.error);
  }

  try {
    const addrResult = await requestAccess();

    if (addrResult.error) {
      if (addrResult.error === "User declined access") {
        throw new Error("Connection declined. Please approve the connection in Freighter.");
      }
      throw new Error(typeof addrResult.error === "string" ? addrResult.error : "Could not get wallet address.");
    }

    const { address } = addrResult;
    if (!address) throw new Error("Wallet connected but no address received. Please unlock Freighter.");

    console.log("Connected successfully:", address);
    return address;
  } catch (err: unknown) {
    // If requestAccess fails fundamentally, it's often because the extension is missing
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("requestAccess is not a function") || !connection.isConnected) {
      throw new Error("Freighter wallet not detected. Please install it from: https://www.freighter.app/");
    }
    throw err;
  }
}

// ─── Contract Call ────────────────────────────────────────────────────────────
export async function callContract(
  funcName: string,
  args: xdr.ScVal[]
): Promise<string> {
  const address = await connectWallet();
  const server = new rpc.Server(RPC_URL);
  const account = await server.getAccount(address);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(funcName, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);

  const signResult = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (signResult.error) {
    throw new Error(typeof signResult.error === "string" ? signResult.error : "Transaction signing failed.");
  }
  const { signedTxXdr } = signResult;

  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(signed);
  return result.hash;
}

// ─── ScVal Helpers ────────────────────────────────────────────────────────────
export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export function numberToScVal(n: number | bigint): xdr.ScVal {
  return nativeToScVal(n, { type: "i128" });
}

export function stringToScVal(s: string): xdr.ScVal {
  return nativeToScVal(s, { type: "string" });
}

export function u32ToScVal(n: number): xdr.ScVal {
  return nativeToScVal(n, { type: "u32" });
}
