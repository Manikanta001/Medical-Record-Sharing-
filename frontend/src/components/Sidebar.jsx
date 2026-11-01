import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Upload,
  Key,
  ShieldCheck,
  Users,
  Search,
  Stethoscope,
  Activity,
  Layers,
  CheckCircle,
  FileCheck
} from 'lucide-react';

export default function Sidebar({ currentTab, onTabChange }) {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  let navItems = [];

  if (role === 'PATIENT') {
    navItems = [
      { id: 'records', label: 'My Medical Records', icon: FileText },
      { id: 'upload', label: 'Upload New Record', icon: Upload },
      { id: 'requests', label: 'Access Requests', icon: Key },
      { id: 'permissions', label: 'Granted Permissions', icon: ShieldCheck },
      { id: 'doctors', label: 'Find Verified Doctors', icon: Stethoscope },
    ];
  } else if (role === 'DOCTOR') {
    navItems = [
      { id: 'records', label: 'Authorized Records', icon: FileCheck },
      { id: 'search', label: 'Search Patients', icon: Search },
      { id: 'requests', label: 'Access Requests Sent', icon: Key },
      { id: 'consultations', label: 'Clinical Consultations', icon: Activity },
    ];
  } else if (role === 'ADMIN') {
    navItems = [
      { id: 'overview', label: 'System Overview', icon: Activity },
      { id: 'doctors', label: 'Doctor Verifications', icon: CheckCircle },
      { id: 'users', label: 'User Directory', icon: Users },
      { id: 'audits', label: 'Security Audit Logs', icon: ShieldCheck },
    ];
  }

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 glass-panel rounded-2xl p-4 border border-slate-800/80">
        <div className="px-3 py-2 mb-3 border-b border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Navigation</span>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-teal-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Callout */}
        <div className="mt-8 pt-4 border-t border-slate-800/60">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px]">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>AES-256-GCM + IPFS</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Files are encrypted client/relay-side before upload to decentralized storage.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
