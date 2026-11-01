import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { ethers } from 'ethers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('medrec_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('medrec_token') || null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('medrec_wallet') || '');

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data?.success) {
            setUser(res.data.user);
            localStorage.setItem('medrec_user', JSON.stringify(res.data.user));
            if (res.data.user.walletAddress) {
              setWalletAddress(res.data.user.walletAddress);
              localStorage.setItem('medrec_wallet', res.data.user.walletAddress);
            }
          }
        } catch (err) {
          console.warn('Failed to verify stored session, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data?.success) {
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('medrec_token', jwtToken);
      localStorage.setItem('medrec_user', JSON.stringify(userData));
      if (userData.walletAddress) {
        setWalletAddress(userData.walletAddress);
        localStorage.setItem('medrec_wallet', userData.walletAddress);
      }
      return userData;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const registerPatient = async (patientData) => {
    const res = await authApi.registerPatient(patientData);
    if (res.data?.success) {
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('medrec_token', jwtToken);
      localStorage.setItem('medrec_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const registerDoctor = async (doctorData) => {
    const res = await authApi.registerDoctor(doctorData);
    if (res.data?.success) {
      const { token: jwtToken, user: userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('medrec_token', jwtToken);
      localStorage.setItem('medrec_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data?.message || 'Doctor registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setWalletAddress('');
    localStorage.removeItem('medrec_token');
    localStorage.removeItem('medrec_user');
    localStorage.removeItem('medrec_wallet');
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(addr);
          localStorage.setItem('medrec_wallet', addr);
          await authApi.linkWallet(addr);
          return addr;
        }
      } else {
        // Fallback for environment without MetaMask - connect default Hardhat demo account for role
        let defaultAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        if (user?.role === 'PATIENT') defaultAddr = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
        if (user?.role === 'ADMIN') defaultAddr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        
        setWalletAddress(defaultAddr);
        localStorage.setItem('medrec_wallet', defaultAddr);
        await authApi.linkWallet(defaultAddr);
        return defaultAddr;
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        walletAddress,
        login,
        registerPatient,
        registerDoctor,
        logout,
        connectWallet,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
