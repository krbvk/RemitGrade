"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { initializeContract } from "@/lib/stellar";

export default function AdminSetup() {
  const { address, connect, setTxHash, setTxError } = useWallet();
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState("");

  async function handleInitialize() {
    setLocalMsg("");
    setTxError(null);
    setTxHash(null);

    if (!address) { 
      await connect(); 
      return; 
    }

    setLoading(true);
    try {
      const hash = await initializeContract(address);
      setTxHash(hash);
      setLocalMsg("✅ Contract initialized successfully! You are now the Admin.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Initialization failed";
      setTxError(msg);
      setLocalMsg("❌ " + msg);
      
      if (msg.includes("already initialised") || msg.includes("UnreachableCodeReached")) {
        setTxError(null); // Clear global error
        setLocalMsg("✅ Contract is already initialized. You are the Admin and can proceed!");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <section id="admin" className="card">
      <div className="card-header">
        <div className="card-icon">🛠️</div>
        <div>
          <h2 className="card-title">Setup & Administration</h2>
          <p className="card-desc">Initialize contract and prepare your wallet</p>
        </div>
      </div>

      <div className="form">
        <div className="admin-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          
          <div className="admin-module">
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
              Permanent Contract Setup
            </h4>
            <div className="alert alert--info" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd", marginBottom: "1rem", fontSize: "0.8rem" }}>
              This sets the permanent Admin address for the dApp. Use your main wallet.
            </div>
            <button
              id="init-contract-btn"
              type="button"
              className="btn btn-primary btn-full btn-sm"
              onClick={handleInitialize}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Initializing…</> : "Initialize Contract"}
            </button>
          </div>

        </div>

        {localMsg && (
          <div className={`alert ${localMsg.startsWith("✅") ? "alert--success" : localMsg.startsWith("ℹ️") ? "alert--info" : "alert--error"}`} style={{ marginTop: "1rem" }}>
            {localMsg}
          </div>
        )}
        
        <p className="form-hint" style={{ marginTop: "1rem", textAlign: "center" }}>
          Connected Wallet: <code style={{ color: "var(--text-mono)" }}>{address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Not connected"}</code>
        </p>
      </div>
    </section>
  );
}
