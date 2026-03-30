"use client";

import { useWallet } from "@/context/WalletContext";
import { CONTRACT_ID, NETWORK_PASSPHRASE } from "@/lib/stellar";

export default function StatusPanel() {
  const { address, txHash, txError } = useWallet();

  return (
    <aside className="status-panel">
      <h3 className="panel-title">
        <span className="panel-icon">📡</span> Network Status
      </h3>

      {/* Network info */}
      <div className="status-item">
        <span className="status-label">Network</span>
        <span className="status-value status-value--network">Testnet</span>
      </div>
      <div className="status-item">
        <span className="status-label">Passphrase</span>
        <span className="status-value status-value--mono status-value--truncate">
          {NETWORK_PASSPHRASE}
        </span>
      </div>

      <div className="divider" />

      {/* Wallet */}
      <h3 className="panel-title">
        <span className="panel-icon">👛</span> Wallet
      </h3>
      <div className="status-item">
        <span className="status-label">Status</span>
        <span className={`status-badge ${address ? "status-badge--connected" : "status-badge--disconnected"}`}>
          {address ? "● Connected" : "○ Disconnected"}
        </span>
      </div>
      {address && (
        <div className="status-item status-item--col">
          <span className="status-label">Address</span>
          <span
            id="wallet-address"
            className="status-value status-value--mono status-value--addr"
            title={address}
          >
            {address}
          </span>
        </div>
      )}

      <div className="divider" />

      {/* Contract */}
      <h3 className="panel-title">
        <span className="panel-icon">📜</span> Contract
      </h3>
      <div className="status-item status-item--col">
        <span className="status-label">ID</span>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
          target="_blank"
          rel="noreferrer"
          className="status-value status-value--mono status-value--addr status-value--link"
          title={CONTRACT_ID}
        >
          {CONTRACT_ID}
        </a>
      </div>

      {/* Last tx */}
      {(txHash || txError) && (
        <>
          <div className="divider" />
          <h3 className="panel-title">
            <span className="panel-icon">🔖</span> Last Transaction
          </h3>
          {txHash && (
            <div className="status-item status-item--col">
              <span className="status-label">Tx Hash</span>
              <a
                id="tx-hash"
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="status-value status-value--mono status-value--addr status-value--link status-value--success"
                title={txHash}
              >
                {txHash}
              </a>
            </div>
          )}
          {txError && (
            <div className="status-item status-item--col">
              <span className="status-label">Error</span>
              <span className="status-value status-value--error">{txError}</span>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
