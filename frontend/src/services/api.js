import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medrec_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized, except on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('medrec_token');
        localStorage.removeItem('medrec_user');
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  registerPatient: (data) => api.post('/auth/register/patient', data),
  registerDoctor: (data) => api.post('/auth/register/doctor', data),
  getMe: () => api.get('/auth/me'),
  linkWallet: (walletAddress) => api.post('/auth/wallet', { walletAddress }),
};

// Records API
export const recordsApi = {
  getMyRecords: () => api.get('/records'),
  getRecordById: (recordId) => api.get(`/records/${recordId}`),
  uploadRecord: (formData, onProgress) =>
    api.post('/records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  downloadRecord: async (recordId, filename = 'medical_record.pdf') => {
    const response = await api.get(`/records/${recordId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/pdf',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return {
      integrityHash: response.headers['x-file-integrity-sha256'],
      ipfsCid: response.headers['x-ipfs-cid'],
    };
  },
  viewRecord: async (recordId) => {
    const preview = window.open('about:blank', '_blank');
    const response = await api.get(`/records/${recordId}/download`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
    const previewUrl = window.URL.createObjectURL(blob);
    if (preview) preview.location.href = previewUrl;
    else {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = 'medical_report.pdf';
      link.click();
    }
    window.setTimeout(() => window.URL.revokeObjectURL(previewUrl), 60000);
    return { integrityHash: response.headers['x-file-integrity-sha256'] };
  },
};

// Access Control API
export const accessApi = {
  requestAccess: (data) => api.post('/access/requests', data),
  getDoctorRequests: () => api.get('/access/requests/doctor'),
  getPatientRequests: () => api.get('/access/requests/patient'),
  approveRequest: (requestId, durationHours) =>
    api.post(`/access/requests/${requestId}/approve`, { customDurationSeconds: Number(durationHours) * 3600 }),
  rejectRequest: (requestId, reason) =>
    api.post(`/access/requests/${requestId}/reject`, { note: reason }),
  revokePermission: (permissionId) =>
    api.post(`/access/permissions/${permissionId}/revoke`),
  getMyPermissions: () => api.get('/access/permissions'),
};

// Doctor API
export const doctorApi = {
  getDirectory: () => api.get('/doctors/directory'),
  searchPatients: (query) => api.get(`/doctors/search-patients?query=${encodeURIComponent(query || '')}`),
  getAuthorizedRecords: () => api.get('/doctors/authorized-records'),
  createConsultation: (data) => api.post('/doctors/consultations', data),
  getConsultations: (patientId) =>
    api.get(`/doctors/consultations${patientId ? `?patientId=${patientId}` : ''}`),
};

// Admin API
export const adminApi = {
  getPendingDoctors: () => api.get('/admin/doctors/pending'),
  verifyDoctor: (doctorId, approved, notes) =>
    api.post(`/admin/doctors/${doctorId}/verify`, { approved, notes }),
  getAllUsers: () => api.get('/admin/users'),
  toggleUserStatus: (userId, isActive) =>
    api.patch(`/admin/users/${userId}/status`, { isActive }),
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

// Dashboard & Blockchain Explorer API
export const dashboardApi = {
  getPatientDashboard: () => api.get('/dashboard/patient'),
  getDoctorDashboard: () => api.get('/dashboard/doctor'),
  getAdminDashboard: () => api.get('/dashboard/admin'),
  getBlockchainExplorer: () => api.get('/dashboard/blockchain-explorer'),
};

export default api;
