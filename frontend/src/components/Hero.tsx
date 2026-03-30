"use client";

import { useWallet } from "@/context/WalletContext";

export default function Hero() {
  const { address, connect, isConnecting } = useWallet();

  return (
    <section className="hero">
      <div className="hero-glow hero-glow--1" />
      <div className="hero-glow hero-glow--2" />

      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Live on Stellar Testnet
        </div>

        <h1 className="hero-title">
          Grade-Gated Scholarships<br />
          <span className="hero-title-accent">on Stellar Soroban</span>
        </h1>

        <p className="hero-desc">
          Milestone-anchored XLM disbursement and cross-border micropayments
          for students and migrant sponsors in Southeast Asia — instant transfers
          at <strong>&lt;$0.001</strong> per transaction.
        </p>

        <div className="hero-actions">
          {!address && (
            <button
              id="hero-connect-btn"
              className="btn btn-primary btn-lg"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? <><span className="spinner" /> Connecting…</> : "🔗 Connect Freighter"}
            </button>
          )}
          <a
            href="https://stellar.expert/explorer/testnet/contract/CAMJGBNR6HLZXKLOCQVJWPHVCRNSYT3KMVFWAW4BZI256BGL23SUQ7EN"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-lg"
          >
            View Contract ↗
          </a>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">&lt;5s</span>
            <span className="stat-label">Settlement</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">&lt;$0.001</span>
            <span className="stat-label">Per TX Fee</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">5 / 5</span>
            <span className="stat-label">Tests Passing</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">Zero</span>
            <span className="stat-label">Middlemen</span>
          </div>
        </div>
      </div>
    </section>
  );
}
