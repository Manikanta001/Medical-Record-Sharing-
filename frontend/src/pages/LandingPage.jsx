import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Lock,
  Key,
  FileCheck,
  Layers,
  ArrowRight,
  Database,
  CheckCircle2,
  Stethoscope,
  User
} from 'lucide-react';

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email, password, redirectPath) => {
    try {
      await login(email, password);
      navigate(redirectPath);
    } catch (err) {
      alert('Quick login failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 text-center overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Ethereum Smart Contract + IPFS + AES-256-GCM Vault</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Patient-Controlled <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-indigo-400 bg-clip-text text-transparent">Medical Record</span> Sharing & Integrity
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate unauthorized medical data exposure. Protect sensitive EHR diagnostics with client-side symmetric encryption, tamper-proof SHA-256 on-chain hashing, and time-bounded doctor authorization.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-lg shadow-teal-500/25 flex items-center space-x-2 group transition-all"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/explorer"
              className="px-6 py-3.5 rounded-xl font-semibold text-slate-200 glass-card hover:bg-slate-800/80 border border-slate-700 flex items-center space-x-2 transition-all"
            >
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Explore Blockchain Ledger</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Demo Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Instant Demo Profiles</h2>
          <p className="text-sm text-slate-400 mt-1">One-click quick evaluation for pre-seeded test accounts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Patient Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <User className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Patient Persona</h3>
                <span className="text-[10px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded font-mono">John Doe</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Upload and encrypt medical records (PDF/lab reports), grant time-limited access to doctors, approve requests, and instantly revoke permissions.
              </p>
            </div>
            <button
              onClick={() => handleQuickLogin('patient.john@gmail.com', 'Patient@123', '/patient')}
              className="mt-6 w-full py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Patient</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Doctor Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 relative group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Doctor Persona</h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-mono">Dr. Sharma</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Request access to patient records, decrypt and view authorized diagnostic scans, review clinical histories, and add consultations.
              </p>
            </div>
            <button
              onClick={() => handleQuickLogin('dr.sharma@hospital.com', 'Doctor@123', '/doctor')}
              className="mt-6 w-full py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Doctor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* Guided one-record demo */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-teal-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="text-[10px] uppercase tracking-wider font-bold text-teal-300">Ready-to-show patient → doctor demo</div>
              <h2 className="text-xl font-bold text-white mt-2">One encrypted report. Patient consent controls access.</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                The doctor starts with no access. They request the sample lipid panel, the patient approves it, and only then can the doctor open the decrypted report.
              </p>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 min-w-[min(100%,36rem)]">
              <li className="p-3 rounded-xl bg-slate-900/70 border border-slate-800"><strong className="block text-indigo-300 mb-1">1 · Doctor requests</strong>Sign in as doctor. The sample report appears under Search Patients.</li>
              <li className="p-3 rounded-xl bg-slate-900/70 border border-slate-800"><strong className="block text-teal-300 mb-1">2 · Patient approves</strong>Sign out, sign in as patient, open Access Requests, and approve.</li>
              <li className="p-3 rounded-xl bg-slate-900/70 border border-slate-800"><strong className="block text-emerald-300 mb-1">3 · Doctor views</strong>Sign back in as doctor, open Authorized Records, then Decrypt &amp; View.</li>
            </ol>
          </div>
          <p className="text-[11px] text-slate-500 mt-4">Demo report: Comprehensive Lipid Panel · No permission is pre-granted. Approval is required before the doctor can decrypt it.</p>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 glass-panel rounded-3xl border border-slate-800 relative">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">End-to-End Cryptographic Architecture</h2>
            <p className="text-slate-400 text-sm mt-2">
              Combining symmetric authenticated encryption with decentralized content-addressing and EVM smart contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">1. AES-256-GCM</h4>
              <p className="text-xs text-slate-400 mt-1">Files encrypted with unique 256-bit symmetric key & 96-bit auth tag</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">2. IPFS Storage</h4>
              <p className="text-xs text-slate-400 mt-1">Encrypted blob pinned on IPFS nodes; raw data never touches plain web</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">3. SHA-256 Hash</h4>
              <p className="text-xs text-slate-400 mt-1">Original file SHA-256 anchored on-chain for verification upon decrypt</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Key className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">4. Smart Access Control</h4>
              <p className="text-xs text-slate-400 mt-1">Solidity smart contract governs authorization timestamps and revocations</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
