import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  doctorApi,
  accessApi,
  recordsApi,
  dashboardApi
} from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import { Badge, StatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import {
  Stethoscope,
  FileCheck,
  Search,
  Key,
  Activity,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  PlusCircle,
  FileText
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('search');
  const [loading, setLoading] = useState(true);

  // Data
  const [stats, setStats] = useState({
    authorizedRecordsCount: 0,
    pendingRequestsCount: 0,
    totalConsultations: 0,
  });
  const [authorizedRecords, setAuthorizedRecords] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & form state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [selectedRecordForConsult, setSelectedRecordForConsult] = useState(null);
  const [selectedRecordForRequest, setSelectedRecordForRequest] = useState(null);

  // Forms
  const [requestForm, setRequestForm] = useState({
    recordId: '',
    durationHours: 48,
    purpose: '',
  });

  const [consultForm, setConsultForm] = useState({
    diagnosis: '',
    clinicalNotes: '',
    prescription: '',
    followUpDate: '',
  });

  const [actionMessage, setActionMessage] = useState(null);

  const isApproved = user?.verificationStatus === 'APPROVED';

  useEffect(() => {
    fetchDoctorData();
    doctorApi.searchPatients('John Doe')
      .then((res) => setSearchResults(res.data?.records || []))
      .catch((err) => console.warn('Could not load demo patient record:', err));
  }, []);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [dashRes, authRecRes, reqRes, consultRes] = await Promise.all([
        dashboardApi.getDoctorDashboard().catch(() => ({ data: {} })),
        doctorApi.getAuthorizedRecords().catch(() => ({ data: { records: [] } })),
        accessApi.getDoctorRequests().catch(() => ({ data: { requests: [] } })),
        doctorApi.getConsultations().catch(() => ({ data: { consultations: [] } })),
      ]);

      if (dashRes.data?.stats) {
        setStats(dashRes.data.stats);
      }
      setAuthorizedRecords(authRecRes.data?.records || []);
      setMyRequests(reqRes.data?.requests || []);
      setConsultations(consultRes.data?.consultations || []);
    } catch (err) {
      console.error('Error fetching doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatients = async (e) => {
    e.preventDefault();
    try {
      const res = await doctorApi.searchPatients(searchQuery);
      setSearchResults(res.data?.records || []);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Search failed');
    }
  };

  const handleDownloadRecord = async (record) => {
    try {
      setActionMessage({ type: 'info', text: `Verifying on-chain permission & decrypting ${record.title}...` });
      const result = await recordsApi.viewRecord(record.recordId);
      setActionMessage({
        type: 'success',
        text: `✓ Report opened after patient permission and SHA-256 integrity verification (${result.integrityHash?.slice(0, 12)}…).`,
      });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Decryption failed: ${err.message}` });
    }
  };

  const handleOpenRequestModal = (record) => {
    setSelectedRecordForRequest(record);
    setRequestForm({
      recordId: record.recordId,
      durationHours: 48,
      purpose: 'Clinical evaluation and diagnostic assessment',
    });
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await accessApi.requestAccess(requestForm);
      setIsRequestModalOpen(false);
      setActionMessage({
        type: 'success',
        text: 'Access request transmitted to patient with cryptographic signature!',
      });
      fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Request submission failed');
    }
  };

  const handleOpenConsultModal = (record) => {
    setSelectedRecordForConsult(record);
    setConsultForm({
      diagnosis: '',
      clinicalNotes: '',
      prescription: '',
      followUpDate: '',
    });
    setIsConsultModalOpen(true);
  };

  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    try {
      await doctorApi.createConsultation({
        patientId: selectedRecordForConsult.patient?._id || selectedRecordForConsult.patient,
        recordId: selectedRecordForConsult.recordId,
        ...consultForm,
      });
      setIsConsultModalOpen(false);
      setActionMessage({
        type: 'success',
        text: 'Clinical consultation recorded and linked to patient file!',
      });
      fetchDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Consultation failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight">Physician Clinical Portal</h1>
            <Badge variant={isApproved ? 'emerald' : 'amber'}>
              {isApproved ? 'VERIFIED PHYSICIAN' : 'PENDING CREDENTIAL REVIEW'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            <strong className="text-slate-200">{user?.fullName}</strong> • {user?.doctorProfile?.specialization} • License: {user?.doctorProfile?.licenseNumber}
          </p>
        </div>
      </div>

      {/* Verification Warning for unapproved doctor */}
      {!isApproved && (
        <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Credential Verification in Progress:</span> Your medical license is currently under review by the Hospital Administrator. Decrypting records and issuing new access requests will be enabled once your smart contract authorization is stamped.
          </div>
        </div>
      )}

      {/* Notifications */}
      {actionMessage && (
        <div
          className={`p-4 mb-6 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Authorized Patient Records"
          value={authorizedRecords.length}
          subtitle="Currently decryptable under valid consent"
          icon={FileCheck}
          color="teal"
        />
        <StatCard
          title="Access Requests Sent"
          value={myRequests.length}
          subtitle="Requests awaiting patient decision"
          icon={Key}
          color="indigo"
        />
        <StatCard
          title="Consultations Logged"
          value={consultations.length}
          subtitle="Clinical diagnoses & prescriptions"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Main Layout */}
      <div className="flex gap-8">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

        <div className="flex-1 min-w-0">
          {/* TAB 1: Authorized Records */}
          {currentTab === 'records' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Authorized Medical Records</h2>
                  <p className="text-xs text-slate-400">Records currently accessible under active patient permissions</p>
                </div>
              </div>

              {authorizedRecords.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No records currently authorized</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Use the "Search Patients" tab to find patient records and request cryptographic access consent.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {authorizedRecords.map((item) => {
                    const rec = item.record || item;
                    return (
                      <div
                        key={rec._id || rec.recordId}
                        className="glass-card p-5 rounded-2xl border border-slate-800/80 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                              <Badge variant="teal">{rec.category}</Badge>
                              <Badge variant="emerald" size="xs">
                                Access Granted
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Patient: <strong className="text-slate-200">{rec.patient?.fullName || 'Registered Patient'}</strong> • File: {rec.originalFileName}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownloadRecord(rec)}
                              className="px-3.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Decrypt & View</span>
                            </button>
                            <button
                              onClick={() => handleOpenConsultModal(rec)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center space-x-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Add Consultation</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-800/60">
                          <div>SHA-256: <span className="text-teal-400">{rec.originalFileHash?.substring(0, 16)}...</span></div>
                          <div>IPFS CID: <span className="text-indigo-400">{rec.ipfsCid?.substring(0, 16)}...</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Search Patients */}
          {currentTab === 'search' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Search Patients & Request Access</h2>
                <p className="text-xs text-slate-400">Search patient records across hospital registry to submit consent requests</p>
              </div>

              <form onSubmit={handleSearchPatients} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by patient name, email, or test title..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((rec) => (
                    <div key={rec._id || rec.recordId} className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                          <Badge variant="teal">{rec.category}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Patient: <strong className="text-slate-200">{rec.patient?.fullName}</strong> ({rec.patient?.email})
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenRequestModal(rec)}
                        disabled={!isApproved}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Request Access</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Requests Sent */}
          {currentTab === 'requests' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Access Requests Sent</h2>
                <p className="text-xs text-slate-400">Track status of consent requests submitted to patients</p>
              </div>

              {myRequests.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No requests sent yet</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myRequests.map((req) => (
                    <div key={req._id || req.requestId} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">{req.record?.title || 'Patient Diagnostic'}</h4>
                          <p className="text-xs text-slate-400">
                            Patient: {req.patient?.fullName || 'Patient'} • Purpose: {req.purpose}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                          Requested Duration: {Math.round((req.requestedDurationSeconds || 86400) / 3600)} hours • Sent: {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Consultations */}
          {currentTab === 'consultations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Clinical Consultations</h2>
                <p className="text-xs text-slate-400">Medical notes and prescriptions issued to patients</p>
              </div>

              {consultations.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No consultations logged</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {consultations.map((c) => (
                    <div key={c._id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Diagnosis: {c.diagnosis}</h4>
                          <p className="text-xs text-teal-400">Patient: {c.patient?.fullName}</p>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        {c.clinicalNotes}
                      </p>
                      {c.prescription && (
                        <div className="text-xs text-amber-300">
                          <strong>Prescription:</strong> {c.prescription}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Request Access Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Submit Access Consent Request">
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Record</label>
            <input
              type="text"
              disabled
              value={selectedRecordForRequest?.title || ''}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Requested Duration</label>
            <select
              value={requestForm.durationHours}
              onChange={(e) => setRequestForm({ ...requestForm, durationHours: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="24">24 Hours (Emergency / Urgent Check)</option>
              <option value="48">48 Hours (Standard Outpatient Consultation)</option>
              <option value="168">7 Days (Treatment Course)</option>
              <option value="720">30 Days (Extended Inpatient Care)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Justification & Purpose</label>
            <textarea
              required
              rows="3"
              value={requestForm.purpose}
              onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
              placeholder="e.g., Pre-operative cardiovascular review and medication reconciliation..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Transmit Request to Patient</span>
          </button>
        </form>
      </Modal>

      {/* Consultation Modal */}
      <Modal isOpen={isConsultModalOpen} onClose={() => setIsConsultModalOpen(false)} title="Record Clinical Consultation">
        <form onSubmit={handleSubmitConsultation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Diagnosis</label>
            <input
              type="text"
              required
              value={consultForm.diagnosis}
              onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
              placeholder="e.g., Mild Hyperlipidemia with Normal Cardiac Enzymes"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Notes & Assessment</label>
            <textarea
              required
              rows="3"
              value={consultForm.clinicalNotes}
              onChange={(e) => setConsultForm({ ...consultForm, clinicalNotes: e.target.value })}
              placeholder="Findings from decrypted laboratory panel..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Prescription / Medications</label>
            <input
              type="text"
              value={consultForm.prescription}
              onChange={(e) => setConsultForm({ ...consultForm, prescription: e.target.value })}
              placeholder="e.g., Atorvastatin 10mg once daily at bedtime"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
          >
            Save Clinical Consultation
          </button>
        </form>
      </Modal>
    </div>
  );
}
