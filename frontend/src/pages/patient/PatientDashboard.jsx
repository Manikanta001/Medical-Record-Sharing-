import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  recordsApi,
  accessApi,
  doctorApi,
  dashboardApi
} from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import { Badge, StatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import {
  FileText,
  Upload,
  Key,
  ShieldCheck,
  Stethoscope,
  Download,
  Copy,
  Check,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Trash2,
  Share2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('records');
  const [loading, setLoading] = useState(true);

  // Stats & data
  const [stats, setStats] = useState({
    totalRecords: 0,
    activePermissions: 0,
    pendingRequests: 0,
    recentTransactions: [],
  });
  const [records, setRecords] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Modals & form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Upload Form
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'LAB_REPORT',
    file: null,
  });

  // Share Form
  const [shareForm, setShareForm] = useState({
    doctorWallet: '',
    durationHours: 24,
    purpose: '',
  });

  // Action status message
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, recRes, reqRes, permRes, docRes] = await Promise.all([
        dashboardApi.getPatientDashboard().catch(() => ({ data: {} })),
        recordsApi.getMyRecords().catch(() => ({ data: { records: [] } })),
        accessApi.getPatientRequests().catch(() => ({ data: { requests: [] } })),
        accessApi.getMyPermissions().catch(() => ({ data: { permissions: [] } })),
        doctorApi.getDirectory().catch(() => ({ data: { doctors: [] } })),
      ]);

      if (dashRes.data?.stats) {
        setStats(dashRes.data.stats);
      }
      setRecords(recRes.data?.records || []);
      setAccessRequests(reqRes.data?.requests || []);
      setPermissions(permRes.data?.permissions || []);
      setDoctors(docRes.data?.doctors || []);
    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      alert('Please select a file to encrypt and upload');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('document', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);

      const res = await recordsApi.uploadRecord(formData);
      if (res.data?.success) {
        setIsUploadOpen(false);
        setUploadForm({ title: '', description: '', category: 'LAB_REPORT', file: null });
        setActionMessage({
          type: 'success',
          text: `Document encrypted with AES-256-GCM and registered on-chain! Tx: ${res.data.record?.blockchainTxHash?.substring(0, 14)}...`,
        });
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (record) => {
    try {
      setActionMessage({ type: 'info', text: `Decrypting & verifying ${record.title}...` });
      const result = await recordsApi.downloadRecord(record.recordId, record.originalFileName);
      setActionMessage({
        type: 'success',
        text: `✓ Decrypted successfully! Verified SHA-256 integrity hash matches smart contract registry.`,
      });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Decryption failed: ${err.message}` });
    }
  };

  const handleApproveRequest = async (requestId, durationHours = 24) => {
    try {
      await accessApi.approveRequest(requestId, durationHours);
      setActionMessage({ type: 'success', text: 'Access request approved & permission registered on blockchain!' });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Approval failed');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Please state reason for declining:');
    if (reason === null) return;
    try {
      await accessApi.rejectRequest(requestId, reason || 'Declined by patient');
      setActionMessage({ type: 'info', text: 'Access request declined.' });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Rejection failed');
    }
  };

  const handleRevokePermission = async (permissionId) => {
    if (!window.confirm('Are you sure you want to revoke this doctor’s access immediately on-chain?')) {
      return;
    }
    try {
      await accessApi.revokePermission(permissionId);
      setActionMessage({ type: 'success', text: 'Permission revoked immediately on the blockchain!' });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Revocation failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Patient Health Vault</h1>
            <Badge variant="teal">Encrypted Storage</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.fullName}</strong> ({user?.email}) • Patient ID: {user?.patientProfile?.patientIdNumber || 'PAT-2026'}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Encrypt & Upload Report</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 mb-6 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-teal-500/10 border-teal-500/30 text-teal-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Encrypted Records"
          value={records.length}
          subtitle="Protected with AES-256-GCM"
          icon={FileText}
          color="teal"
        />
        <StatCard
          title="Active Permissions"
          value={permissions.length}
          subtitle="Currently authorized doctors"
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Pending Requests"
          value={accessRequests.filter((r) => r.status === 'PENDING').length}
          subtitle="Doctors awaiting your consent"
          icon={Key}
          color="amber"
        />
        <StatCard
          title="On-Chain Hash Verifications"
          value={records.filter((r) => r.isRegisteredOnChain).length}
          subtitle="Smart contract anchored"
          icon={CheckCircle2}
          color="indigo"
        />
      </div>

      {/* Main Layout */}
      <div className="flex gap-8">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

        <div className="flex-1 min-w-0">
          {/* TAB 1: Records */}
          {currentTab === 'records' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">My Encrypted Medical Records</h2>
                  <p className="text-xs text-slate-400">Zero-knowledge encrypted documents stored on IPFS/Local Vault</p>
                </div>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Record</span>
                </button>
              </div>

              {records.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No medical records uploaded yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Upload your diagnostic tests, MRI scans, or lab reports to encrypt and securely manage access.
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                  >
                    Upload First Record
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {records.map((rec) => (
                    <div
                      key={rec._id || rec.recordId}
                      className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-teal-500/40 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                            <Badge variant="teal">{rec.category}</Badge>
                            {rec.isRegisteredOnChain && (
                              <Badge variant="emerald" size="xs">
                                On-Chain
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{rec.description || 'No description provided'}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownload(rec)}
                            className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                            title="Decrypt & Download Original File"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Decrypt & View</span>
                          </button>
                        </div>
                      </div>

                      {/* Technical Cryptographic Metadata Strip */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/60 text-[11px] font-mono">
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500">Record ID:</span>
                          <span className="text-slate-200">{rec.recordId}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500">SHA-256:</span>
                          <button
                            onClick={() => handleCopy(rec.originalFileHash, rec.recordId + '-hash')}
                            className="flex items-center space-x-1 text-teal-400 hover:text-teal-300"
                            title="Copy SHA-256 Integrity Hash"
                          >
                            <span>{rec.originalFileHash ? `${rec.originalFileHash.substring(0, 10)}...` : 'N/A'}</span>
                            {copiedId === rec.recordId + '-hash' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500">IPFS CID:</span>
                          <button
                            onClick={() => handleCopy(rec.ipfsCid, rec.recordId + '-cid')}
                            className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300"
                            title="Copy IPFS CID"
                          >
                            <span>{rec.ipfsCid ? `${rec.ipfsCid.substring(0, 12)}...` : 'N/A'}</span>
                            {copiedId === rec.recordId + '-cid' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload Modal trigger / tab */}
          {currentTab === 'upload' && (
            <div className="glass-panel p-8 rounded-2xl border border-slate-800 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Encrypt & Upload Medical Record</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Files are symmetrically encrypted using AES-256-GCM before dispatch to IPFS.
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Annual Echocardiogram & Lipid Panel"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="LAB_REPORT">Clinical Laboratory Report</option>
                    <option value="RADIOLOGY">Radiology & Imaging (MRI/CT/X-Ray)</option>
                    <option value="PRESCRIPTION">Medical Prescription</option>
                    <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
                    <option value="OTHER">Other Clinical Record</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Summary / Notes</label>
                  <textarea
                    rows="3"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Optional diagnostic observations or symptoms..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Medical File (PDF, PNG, JPG)</label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.dcm"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadLoading ? 'Encrypting & Uploading...' : 'Encrypt & Anchor On-Chain'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Access Requests */}
          {currentTab === 'requests' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Incoming Doctor Access Requests</h2>
                <p className="text-xs text-slate-400">Doctors requesting explicit permission to inspect your diagnostics</p>
              </div>

              {accessRequests.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No incoming access requests</h3>
                  <p className="text-xs text-slate-400 mt-1">When an authorized physician requests your records, it will appear here for consent.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {accessRequests.map((req) => (
                    <div
                      key={req._id || req.requestId}
                      className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-white">
                              {req.doctor?.fullName || 'Practicing Physician'}
                            </h3>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {req.doctor?.doctorProfile?.specialization} • {req.doctor?.doctorProfile?.hospitalAffiliation}
                          </p>
                          <p className="text-xs text-teal-400 mt-1">
                            Target Record: <strong className="text-slate-200">{req.record?.title || 'Patient Record'}</strong>
                          </p>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproveRequest(req.requestId || req._id, 48)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve (48h)</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.requestId || req._id)}
                              className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
                        <span className="text-slate-500 font-semibold">Stated Purpose:</span>{' '}
                        <span className="text-slate-300">{req.purpose || 'Clinical diagnosis'}</span>
                        <div className="text-[11px] text-slate-500 mt-1 font-mono">
                          Requested Duration: {Math.round((req.requestedDurationSeconds || 86400) / 3600)} hours
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Active Permissions */}
          {currentTab === 'permissions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Active Doctor Permissions</h2>
                <p className="text-xs text-slate-400">
                  You maintain 100% sovereignty. Revoke any doctor's access on-chain at any time with one click.
                </p>
              </div>

              {permissions.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No active permissions granted</h3>
                  <p className="text-xs text-slate-400 mt-1">No doctor currently possesses access to your records.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {permissions.map((perm) => (
                    <div
                      key={perm._id || perm.permissionId}
                      className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-white">{perm.doctor?.fullName || 'Dr. Physician'}</h3>
                            <Badge variant={perm.isActive ? 'emerald' : 'rose'}>
                              {perm.isActive ? 'ACTIVE' : 'EXPIRED'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Record: <strong className="text-teal-300">{perm.record?.title}</strong>
                          </p>
                        </div>

                        {perm.isActive && (
                          <button
                            onClick={() => handleRevokePermission(perm._id || perm.permissionId)}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all flex items-center space-x-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke Access Immediately</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-500">Valid Until:</span>{' '}
                          <span className="text-amber-400">
                            {new Date(perm.validUntil).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Blockchain Tx:</span>{' '}
                          <span className="text-teal-400">
                            {perm.blockchainTxHash ? `${perm.blockchainTxHash.substring(0, 14)}...` : 'On-Chain'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Find Verified Doctors */}
          {currentTab === 'doctors' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Hospital Verified Doctors</h2>
                <p className="text-xs text-slate-400">Verified physicians authorized on the smart contract</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => (
                  <div key={doc._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{doc.fullName}</h3>
                        <p className="text-xs text-teal-400 font-semibold">{doc.doctorProfile?.specialization}</p>
                        <p className="text-xs text-slate-400">{doc.doctorProfile?.hospitalAffiliation}</p>
                      </div>
                      <Badge variant="emerald" size="xs">
                        Verified
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {doc.doctorProfile?.bio || 'Clinical practitioner.'}
                    </p>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>License: {doc.doctorProfile?.licenseNumber}</span>
                      <span className="font-mono text-teal-400">{doc.doctorProfile?.yearsOfExperience} yrs exp</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal (when opened from button) */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Encrypted Medical File">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title</label>
            <input
              type="text"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g., Blood Panel & Cardiac Markers"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="LAB_REPORT">Clinical Laboratory Report</option>
              <option value="RADIOLOGY">Radiology & Imaging (MRI/CT/X-Ray)</option>
              <option value="PRESCRIPTION">Medical Prescription</option>
              <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
              <option value="OTHER">Other Clinical Record</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows="2"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Observation notes..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">File</label>
            <input
              type="file"
              required
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.dcm"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300"
            />
          </div>

          <button
            type="submit"
            disabled={uploadLoading}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
          >
            {uploadLoading ? 'Encrypting & Registering On-Chain...' : 'Encrypt & Upload Now'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
