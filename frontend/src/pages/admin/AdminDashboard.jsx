import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, dashboardApi } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import { Badge, StatusBadge } from '../../components/Badge';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Layers,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Stats & data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecords: 0,
    pendingDoctorsCount: 0,
    totalTransactions: 0,
    recentAudits: [],
  });
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [dashRes, docRes, userRes, auditRes] = await Promise.all([
        dashboardApi.getAdminDashboard().catch(() => ({ data: {} })),
        adminApi.getPendingDoctors().catch(() => ({ data: { doctors: [] } })),
        adminApi.getAllUsers().catch(() => ({ data: { users: [] } })),
        adminApi.getAuditLogs().catch(() => ({ data: { logs: [] } })),
      ]);

      if (dashRes.data?.stats) setStats(dashRes.data.stats);
      setPendingDoctors(docRes.data?.doctors || []);
      setUsers(userRes.data?.users || []);
      setAuditLogs(auditRes.data?.logs || []);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoctor = async (doctorId, approved) => {
    const notes = prompt(`Verification review notes for ${approved ? 'approval' : 'rejection'}:`, approved ? 'Credentials and Medical Council license verified' : 'Incomplete documentation');
    if (notes === null) return;

    try {
      await adminApi.verifyDoctor(doctorId, approved, notes);
      setActionMessage({
        type: 'success',
        text: `Physician credentials ${approved ? 'approved' : 'rejected'} and synchronized to smart contract!`,
      });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Verification update failed');
    }
  };

  const handleToggleUser = async (userId, currentStatus) => {
    try {
      await adminApi.toggleUserStatus(userId, !currentStatus);
      setActionMessage({
        type: 'info',
        text: `User account status updated.`,
      });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Hospital Administration Console</h1>
            <Badge variant="amber">SYSTEM OPERATOR</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.fullName}</strong> ({user?.email}) • Relay Signer: Active
          </p>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`p-4 mb-6 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers || users.length}
          subtitle="Patients, doctors & admins"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Pending Doctor Reviews"
          value={pendingDoctors.length}
          subtitle="Physicians awaiting license check"
          icon={CheckCircle}
          color="amber"
        />
        <StatCard
          title="Smart Contract TXs"
          value={stats.totalTransactions || 0}
          subtitle="Confirmed on Ethereum ledger"
          icon={Layers}
          color="indigo"
        />
        <StatCard
          title="Security Audit Events"
          value={auditLogs.length}
          subtitle="Immutable access logs"
          icon={ShieldAlert}
          color="emerald"
        />
      </div>

      {/* Layout */}
      <div className="flex gap-8">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

        <div className="flex-1 min-w-0">
          {/* TAB 1: Overview */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Doctor Verification Queue */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Pending Doctor Approvals</h3>
                    <Badge variant="amber">{pendingDoctors.length} Pending</Badge>
                  </div>

                  {pendingDoctors.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">All physician credentials are up to date.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingDoctors.slice(0, 3).map((doc) => (
                        <div key={doc._id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{doc.fullName}</span>
                            <span className="text-[10px] text-teal-400 font-mono">{doc.doctorProfile?.specialization}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            License: {doc.doctorProfile?.licenseNumber} • {doc.doctorProfile?.hospitalAffiliation}
                          </p>
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => handleVerifyDoctor(doc._id, true)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold"
                            >
                              Approve On-Chain
                            </button>
                            <button
                              onClick={() => handleVerifyDoctor(doc._id, false)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 text-[11px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Audit Stream */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Latest Security Events</h3>
                    <Badge variant="teal">Tamper-Proof</Badge>
                  </div>

                  <div className="space-y-2.5">
                    {auditLogs.slice(0, 5).map((log) => (
                      <div key={log._id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-teal-400 font-semibold">{log.action}</span>
                            <Badge variant={log.status === 'SUCCESS' ? 'emerald' : 'rose'} size="xs">
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Doctors Verification */}
          {currentTab === 'doctors' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Physician Credential Verification</h2>
                <p className="text-xs text-slate-400">
                  Review medical council licenses. Approving marks the doctor as authorized on the smart contract.
                </p>
              </div>

              {pendingDoctors.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No pending reviews</h3>
                  <p className="text-xs text-slate-400 mt-1">All doctor registrations have been audited.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingDoctors.map((doc) => (
                    <div key={doc._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-white">{doc.fullName}</h3>
                            <Badge variant="amber">PENDING REVIEW</Badge>
                          </div>
                          <p className="text-xs text-teal-400 mt-0.5">{doc.email} • {doc.phone}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVerifyDoctor(doc._id, true)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve & Authorize On-Chain</span>
                          </button>
                          <button
                            onClick={() => handleVerifyDoctor(doc._id, false)}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500">License Number:</span>
                          <p className="text-white font-mono font-semibold">{doc.doctorProfile?.licenseNumber}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Degree & Specialization:</span>
                          <p className="text-white">{doc.doctorProfile?.medicalDegree} - {doc.doctorProfile?.specialization}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Affiliated Hospital:</span>
                          <p className="text-white">{doc.doctorProfile?.hospitalAffiliation}</p>
                        </div>
                      </div>

                      {doc.doctorProfile?.bio && (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <strong>Professional Bio:</strong> {doc.doctorProfile?.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Users */}
          {currentTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Users Directory</h2>
                <p className="text-xs text-slate-400">All registered system actors across departments</p>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Wallet Address</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{u.fullName}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.role === 'PATIENT' ? 'teal' : u.role === 'DOCTOR' ? 'indigo' : 'amber'}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {u.walletAddress ? `${u.walletAddress.substring(0, 8)}...${u.walletAddress.substring(u.walletAddress.length - 4)}` : 'No wallet'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.isActive ? 'emerald' : 'rose'} size="xs">
                              {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleToggleUser(u._id, u.isActive)}
                              className="text-[11px] font-semibold text-teal-400 hover:text-teal-300"
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Audits */}
          {currentTab === 'audits' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Cryptographic Security Audit Log</h2>
                <p className="text-xs text-slate-400">HIPAA & GDPR-compliant tamper-evident event stream</p>
              </div>

              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-teal-400 font-bold whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {log.actorEmail} ({log.actorRole})
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-sans">
                            {log.details}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={log.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
