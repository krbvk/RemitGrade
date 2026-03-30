import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RemitGrade — Grade-Gated Scholarships on Stellar",
  description:
    "Milestone-anchored XLM disbursement and cross-border micropayments for students and migrant sponsors in Southeast Asia, powered by Stellar Soroban.",
  keywords: ["Stellar", "Soroban", "XLM", "Scholarship", "Remittance", "Blockchain", "DeFi"],
  openGraph: {
    title: "RemitGrade",
    description: "Grade-gated scholarship disbursement on Stellar Soroban",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
