"use client";

import { useWallet } from "@/context/WalletContext";

export default function Header() {
  const { address, isConnecting, connect, disconnect, error } = useWallet();

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <div className="logo-text">
            <span className="logo-name">RemitGrade</span>
            <span className="logo-tagline">Stellar · Soroban</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="nav-links">
          <a href="#admin" className="nav-link">Admin</a>
          <a href="#enroll" className="nav-link">Enroll</a>
          <a href="#deposit" className="nav-link">Deposit</a>
          <a href="#grades" className="nav-link">Grades</a>
          <a href="#remittance" className="nav-link">Remittance</a>
        </nav>

        {/* Wallet button & Error block */}
        <div className="header-actions">
          {error && !address && (
            <div className="header-error" title={error} style={{ fontSize: "0.75rem", maxWidth: "150px", lineHeight: "1.2" }}>
              ⚠️ {error.length > 25 ? error.slice(0, 25) + "…" : error}
            </div>
          )}

          {address ? (
            <div className="wallet-connected">
              <span className="wallet-badge">
                <span className="wallet-dot" />
                {shortAddr}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              id="connect-wallet-btn"
              className="btn btn-primary"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting…
                </>
              ) : (
                <>
                  <span>🔗</span> Connect Wallet
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
