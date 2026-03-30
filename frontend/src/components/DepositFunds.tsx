"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { callContract, addressToScVal, numberToScVal, NATIVE_TOKEN_ID } from "@/lib/stellar";

export default function DepositFunds() {
  const { address, connect, setTxHash, setTxError } = useWallet();
  const [student, setStudent] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalMsg("");
    setTxError(null);
    setTxHash(null);

    if (!address) { await connect(); return; }
    if (!student.trim()) return setLocalMsg("Student address is required.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return setLocalMsg("Enter a valid amount.");

    // XLM (native asset) has 7 decimal places on Stellar
    const stroops = Math.round(amt * 10_000_000);

    setLoading(true);
    try {
      const hash = await callContract("deposit_funds", [
        addressToScVal(address),
        addressToScVal(NATIVE_TOKEN_ID),
        addressToScVal(student.trim()),
        numberToScVal(stroops),
      ]);
      setTxHash(hash);
      setLocalMsg(`✅ Deposited ${amt} XLM successfully!`);
      setStudent("");
      setAmount("");
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Transaction failed";
      console.error("Deposit error:", err);
      
      if (msg.includes("#10") || msg.toLowerCase().includes("balance is not within")) {
        msg = "Insufficient XLM funds. You need testnet XLM to make a deposit.";
      }
      
      setTxError(msg);
      setLocalMsg("❌ " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="deposit" className="card">
      <div className="card-header">
        <div className="card-icon">💰</div>
        <div>
          <h2 className="card-title">Deposit Funds</h2>
          <p className="card-desc">Sponsor deposits XLM into a student&apos;s escrow pool</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="deposit-student" className="form-label">Student Wallet Address</label>
          <input
            id="deposit-student"
            type="text"
            className="form-input"
            placeholder="G..."
            value={student}
            onChange={e => setStudent(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="deposit-amount" className="form-label">Amount (XLM)</label>
          <div className="input-suffix-wrap">
            <input
              id="deposit-amount"
              type="number"
              step="0.01"
              min="0"
              className="form-input input-suffix-input"
              placeholder="e.g. 100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <span className="input-suffix">XLM</span>
          </div>
          <div className="quick-amounts">
            {[10, 50, 100, 300].map(n => (
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
          id="deposit-submit-btn"
          type="submit"
          className="btn btn-secondary btn-full"
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Processing…</> : "Deposit XLM"}
        </button>
      </form>
    </section>
  );
}
