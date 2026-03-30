"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { callContract, addressToScVal, numberToScVal, stringToScVal, NATIVE_TOKEN_ID } from "@/lib/stellar";

export default function Remittance() {
  const { address, connect, setTxHash, setTxError } = useWallet();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [remitId, setRemitId] = useState("");
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState("");

  function generateRemitId() {
    const prefix = "REMIT";
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 1000);
    setRemitId(`${prefix}-${timestamp}-${random}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalMsg(""); setTxError(null); setTxHash(null);

    if (!address) { await connect(); return; }
    if (!receiver.trim()) return setLocalMsg("Receiver address is required.");
    if (!remitId.trim()) return setLocalMsg("Remittance ID is required.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return setLocalMsg("Enter a valid amount.");

    const stroops = Math.round(amt * 10_000_000);
    setLoading(true);
    try {
      const hash = await callContract("send_remittance", [
        addressToScVal(address),
        addressToScVal(NATIVE_TOKEN_ID),
        addressToScVal(receiver.trim()),
        numberToScVal(stroops),
        stringToScVal(remitId.trim()),
      ]);
      setTxHash(hash);
      setLocalMsg(`✅ Sent ${amt} XLM — receipt ID: ${remitId}`);
      setReceiver(""); setAmount(""); setRemitId("");
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Transaction failed";
      console.error("Remittance error:", err);
      
      if (msg.includes("#10") || msg.toLowerCase().includes("balance is not within")) {
        msg = "Insufficient XLM funds. You need testnet XLM to send remittances.";
      }
      
      setTxError(msg); setLocalMsg("❌ " + msg);
    } finally { setLoading(false); }
  }

  return (
    <section id="remittance" className="card">
      <div className="card-header">
        <div className="card-icon">🌏</div>
        <div>
          <h2 className="card-title">Send Remittance</h2>
          <p className="card-desc">Cross-border micropayments — instant, &lt;$0.001 fee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="remit-receiver" className="form-label">Receiver Wallet Address</label>
          <input
            id="remit-receiver"
            type="text"
            className="form-input"
            placeholder="G..."
            value={receiver}
            onChange={e => setReceiver(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="remit-amount" className="form-label">Amount (XLM)</label>
          <div className="input-suffix-wrap">
            <input
              id="remit-amount"
              type="number"
              step="0.01"
              min="0"
              className="form-input input-suffix-input"
              placeholder="e.g. 5"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <span className="input-suffix">XLM</span>
          </div>
          <div className="quick-amounts">
            {[1, 5, 10, 25].map(n => (
              <button
                key={n}
                type="button"
                className={`quick-btn ${amount === String(n) ? "quick-btn--active" : ""}`}
                onClick={() => setAmount(String(n))}
              >
                {n} XLM
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="remit-id" className="form-label">Remittance ID / Reference</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="remit-id"
              type="text"
              className="form-input"
              placeholder="INV-2025-001"
              style={{ flex: 1 }}
              value={remitId}
              onChange={e => setRemitId(e.target.value)}
            />
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              onClick={generateRemitId}
            >
              🔄 Generate
            </button>
          </div>
          <p className="form-hint">On-chain receipt the student can show to university registrar</p>
        </div>

        {localMsg && (
          <div className="alert-wrap">
            <div className={`alert ${localMsg.startsWith("✅") ? "alert--success" : "alert--error"}`}>
              {localMsg}
            </div>
            {localMsg.includes("Insufficient XLM") && (
              <div style={{ marginTop: "0.5rem" }}>
                <a 
                  href="https://laboratory.stellar.org/#account-creator?network=testnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-full btn-sm"
                  style={{ textDecoration: "none", color: "#93c5fd", border: "1px solid rgba(147,197,253,0.3)" }}
                >
                  🚰 Get Testnet XLM (Stellar Laboratory)
                </a>
              </div>
            )}
          </div>
        )}

        <button
          id="remit-submit-btn"
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Sending…</> : "🚀 Send Remittance (XLM)"}
        </button>
      </form>
    </section>
  );
}
