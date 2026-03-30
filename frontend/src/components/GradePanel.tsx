"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { callContract, addressToScVal, u32ToScVal, NATIVE_TOKEN_ID, getStudentPool } from "@/lib/stellar";

export default function GradePanel() {
  const { address, connect, setTxHash, setTxError } = useWallet();
  const [student, setStudent] = useState("");
  const [index, setIndex] = useState("0");
  const [loading, setLoading] = useState<"grade" | "release" | "check" | null>(null);
  const [localMsg, setLocalMsg] = useState("");
  const [poolData, setPoolData] = useState<any>(null);

  async function handleCheckStatus() {
    setLocalMsg(""); setTxError(null); setTxHash(null); setPoolData(null);
    if (!student.trim()) return setLocalMsg("Enter a student address to check.");
    setLoading("check");
    try {
      const data = await getStudentPool(student.trim());
      setPoolData(data);
      console.log("Pool data:", data);
    } catch (err: unknown) {
      setLocalMsg("❌ " + (err instanceof Error ? err.message : "Failed to fetch status"));
    } finally { setLoading(null); }
  }

  async function handleUnlockGrade() {
    setLocalMsg(""); setTxError(null); setTxHash(null);
    if (!address) { await connect(); return; }
    if (!student.trim()) return setLocalMsg("Student address is required.");
    setLoading("grade");
    try {
      const hash = await callContract("unlock_grade", [
        addressToScVal(address),
        addressToScVal(student.trim()),
        u32ToScVal(parseInt(index)),
      ]);
      setTxHash(hash);
      setLocalMsg("✅ Grade milestone unlocked!");
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("UnreachableCodeReached") || msg.toLowerCase().includes("not initialised")) {
        msg = "Unauthorized or contract not initialized. Ensure Admin Setup is complete.";
      }
      setTxError(msg); setLocalMsg("❌ " + msg);
    } finally { setLoading(null); }
  }

  async function handleReleaseTranche() {
    setLocalMsg(""); setTxError(null); setTxHash(null);
    if (!address) { await connect(); return; }
    if (!student.trim()) return setLocalMsg("Student address is required.");
    setLoading("release");
    try {
      const hash = await callContract("release_tranche", [
        addressToScVal(address),
        addressToScVal(NATIVE_TOKEN_ID),
        addressToScVal(student.trim()),
        u32ToScVal(parseInt(index)),
      ]);
      setTxHash(hash);
      setLocalMsg("✅ Tranche released to student!");
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("UnreachableCodeReached") || msg.toLowerCase().includes("not initialised")) {
        msg = "Unauthorized or contract not initialized. Ensure Admin Setup is complete.";
      }
      setTxError(msg); setLocalMsg("❌ " + msg);
    } finally { setLoading(null); }
  }

  return (
    <section id="grades" className="card">
      <div className="card-header">
        <div className="card-icon">📊</div>
        <div>
          <h2 className="card-title">Grade Management</h2>
          <p className="card-desc">Admin: unlock grade milestones and release XLM tranches</p>
        </div>
      </div>

      <div className="form">
        <div className="form-group">
          <label htmlFor="grade-student" className="form-label">Student Wallet Address</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="grade-student"
              type="text"
              className="form-input"
              placeholder="G..."
              style={{ flex: 1 }}
              value={student}
              onChange={e => setStudent(e.target.value)}
            />
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              style={{ whiteSpace: "nowrap" }}
              onClick={handleCheckStatus}
              disabled={loading !== null}
            >
              {loading === "check" ? "…" : "🔍 Check Status"}
            </button>
          </div>
        </div>

        {poolData && (
          <div className="pool-info" style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Total Deposited:</span>
              <span style={{ color: "var(--accent-color)", fontWeight: "600" }}>{Number(poolData.total_deposited) / 10_000_000} XLM</span>
            </div>
            
            <div className="milestone-status-grid" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {Array.from({ length: Number(poolData.milestone_count) }).map((_, i) => {
                const isUnlocked = (Number(poolData.grade_milestones) & (1 << i)) !== 0;
                return (
                  <div key={i} style={{ 
                    padding: "0.4rem 0.6rem", 
                    borderRadius: "4px", 
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: isUnlocked ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                    border: isUnlocked ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    color: isUnlocked ? "#6ee7b7" : "var(--text-muted)"
                  }}>
                    {isUnlocked ? "✅" : "🔒"} M{i}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Milestone Index</label>
          <div className="milestone-selector">
            {(poolData ? Array.from({ length: Number(poolData.milestone_count) }) : [0, 1, 2, 3, 4]).map((_, n) => (
              <button
                key={n}
                type="button"
                className={`milestone-btn ${index === String(n) ? "milestone-btn--active" : ""}`}
                onClick={() => setIndex(String(n))}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="form-hint">Zero-indexed: first grade = 0</p>
        </div>

        {localMsg && (
          <div className={`alert ${localMsg.startsWith("✅") ? "alert--success" : "alert--error"}`}>
            {localMsg}
          </div>
        )}

        <div className="btn-row">
          <button
            id="unlock-grade-btn"
            type="button"
            className="btn btn-accent btn-full"
            onClick={handleUnlockGrade}
            disabled={loading !== null}
          >
            {loading === "grade" ? <><span className="spinner" /> Processing…</> : "🔓 Unlock Grade"}
          </button>
          <button
            id="release-tranche-btn"
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleReleaseTranche}
            disabled={loading !== null}
          >
            {loading === "release" ? <><span className="spinner" /> Processing…</> : "💸 Release XLM Tranche"}
          </button>
        </div>
      </div>
    </section>
  );
}
