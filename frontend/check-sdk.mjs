import * as sdk from "@stellar/stellar-sdk";
console.log(Object.keys(sdk).filter(k => k.toLowerCase().includes("soroban") || k.toLowerCase().includes("rpc")).join(", "));
