"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { callContract, addressToScVal, u32ToScVal } from "@/lib/stellar";

export default function EnrollStudent() {
  const { address, connect, setTxHash, setTxError } = useWallet();
  const [student, setStudent] = useState("");
  const [milestones, setMilestones] = useState("3");
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalMsg("");
    setTxError(null);
    setTxHash(null);

    if (!address) { await connect(); return; }
    if (!student.trim()) return setLocalMsg("Student address is required.");
    const mc = parseInt(milestones);
    if (isNaN(mc) || mc < 1 || mc > 10) return setLocalMsg("Milestone count must be 1–10.");

    setLoading(true);
    try {
      const hash = await callContract("enroll_student", [
        addressToScVal(address),
        addressToScVal(student.trim()),
        u32ToScVal(mc),
      ]);
      setTxHash(hash);
      setLocalMsg("✅ Student enrolled successfully!");
      setStudent("");
      setMilestones("3");
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Transaction failed";
      
      if (msg.includes("UnreachableCodeReached") || msg.toLowerCase().includes("not initialised")) {
        msg = "Contract not initialized or unauthorized. Please ensure Admin Setup is complete.";
      }
      
      setTxError(msg);
      setLocalMsg("❌ " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="enroll" className="card">
      <div className="card-header">
        <div className="card-icon">🎓</div>
        <div>
          <h2 className="card-title">Enroll Student</h2>
          <p className="card-desc">Register a student wallet with grade milestones</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="enroll-student" className="form-label">
            Student Wallet Address
          </label>
          <input
            id="enroll-student"
            type="text"
            className="form-input"
            placeholder="G..."
            value={student}
            onChange={e => setStudent(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="enroll-milestones" className="form-label">
            Milestone Count
          </label>
          <div className="milestone-selector">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`milestone-btn ${milestones === String(n) ? "milestone-btn--active" : ""}`}
                onClick={() => setMilestones(String(n))}
              >
                {n}
              </button>
            ))}
            <input
              id="enroll-milestones"
              type="number"
              min={1}
              max={10}
              className="form-input form-input--sm"
              value={milestones}
              onChange={e => setMilestones(e.target.value)}
            />
          </div>
          <p className="form-hint">Each milestone = 1 XLM tranche release</p>
        </div>

        {localMsg && (
          <div className={`alert ${localMsg.startsWith("✅") ? "alert--success" : "alert--error"}`}>
            {localMsg}
          </div>
        )}

        <button
          id="enroll-submit-btn"
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Processing…</> : "Enroll Student"}
        </button>
      </form>
    </section>
  );
}
