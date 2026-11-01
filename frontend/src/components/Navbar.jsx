import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Wallet, 
  LogOut, 
  User, 
  ExternalLink, 
  Check, 
  Copy,
  Activity,
  Layers
} from 'lucide-react';

export default function Navbar() {
  const { user, walletAddress, logout, connectWallet } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await connectWallet();
    } catch (err) {
      alert('Could not connect wallet: ' + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-white tracking-tight">Med<span className="text-teal-400">Ledger</span></span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-widest">Web3</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block -mt-1">Zero-Trust Medical Access Control</p>
          </div>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center space-x-3">
          <Link
            to="/explorer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
          >
            <Layers className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Blockchain Explorer</span>
          </Link>

          {user ? (
            <>
              {/* Wallet connection pill */}
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                {walletAddress ? (
                  <button
                    onClick={handleCopyWallet}
                    title="Click to copy wallet address"
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-mono text-[11px] text-emerald-400">{formatAddress(walletAddress)}</span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5 text-teal-400" />
                    <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
                  </button>
                )}
              </div>

              {/* User badge */}
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white">{user.fullName}</span>
                  <span className="text-[10px] font-mono text-teal-400 uppercase tracking-wider">{user.role}</span>
                </div>
                
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
