import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatusPanel from "@/components/StatusPanel";
import EnrollStudent from "@/components/EnrollStudent";
import DepositFunds from "@/components/DepositFunds";
import GradePanel from "@/components/GradePanel";
import Remittance from "@/components/Remittance";
import AdminSetup from "@/components/AdminSetup";

export default function Home() {
  return (
    <div className="app">
      <Header />

      <main className="main">
        <Hero />

        <div className="dashboard">
          {/* Left: Action panels */}
          <div className="actions-col">
            <AdminSetup />
            <EnrollStudent />
            <DepositFunds />
            <GradePanel />
            <Remittance />
          </div>

          {/* Right: Status sidebar */}
          <div className="status-col">
            <StatusPanel />

            {/* Flow diagram */}
            <div className="card flow-card">
              <h3 className="panel-title" style={{ marginBottom: "1rem" }}>
                <span className="panel-icon">⚡</span> Transaction Flow
              </h3>
              <ol className="flow-list">
                {[
                  { icon: "🛠️", step: "Admin initialize", desc: "initialize()" },
                  { icon: "🎓", step: "Admin enrolls student", desc: "enroll_student()" },
                  { icon: "💰", step: "Sponsor deposits XLM", desc: "deposit_funds()" },
                  { icon: "🔓", step: "Admin unlocks grade", desc: "unlock_grade()" },
                  { icon: "💸", step: "Tranche released", desc: "release_tranche()" },
                  { icon: "🌏", step: "Direct micropayment", desc: "send_remittance()" },
                ].map((item, i) => (
                  <li key={i} className="flow-item">
                    <span className="flow-num">{i + 1}</span>
                    <span className="flow-icon">{item.icon}</span>
                    <div>
                      <span className="flow-step">{item.step}</span>
                      <code className="flow-fn">{item.desc}</code>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          RemitGrade © 2025 · Built on{" "}
          <a href="https://stellar.org" target="_blank" rel="noreferrer" className="footer-link">
            Stellar Soroban
          </a>{" "}
          · Contract:{" "}
          <a
            href="https://stellar.expert/explorer/testnet/contract/CAMJGBNR6HLZXKLOCQVJWPHVCRNSYT3KMVFWAW4BZI256BGL23SUQ7EN"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            CAMJGBNR…SUQ7EN
          </a>
        </p>
      </footer>
    </div>
  );
}
