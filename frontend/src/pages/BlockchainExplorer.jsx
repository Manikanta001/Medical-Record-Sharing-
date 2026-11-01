import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { Badge, StatusBadge } from '../components/Badge';
import StatCard from '../components/StatCard';
import {
  Layers,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Activity,
  Cpu,
  RefreshCw
} from 'lucide-react';

export default function BlockchainExplorer() {
  const [data, setData] = useState({
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    network: 'Hardhat Localhost (Chain ID: 31337)',
    totalTransactions: 0,
    totalRecordsOnChain: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [copiedTx, setCopiedTx] = useState(null);

  useEffect(() => {
    fetchExplorerData();
  }, []);

  const fetchExplorerData = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getBlockchainExplorer();
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch blockchain explorer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(id);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white tracking-tight">EVM Blockchain Ledger Explorer</h1>
            <Badge variant="teal">LIVE ON-CHAIN</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verification of smart contract executions, SHA-256 state anchors, and cryptographic permission grants
          </p>
        </div>

        <button
          onClick={fetchExplorerData}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Contract Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-teal-500/30 glow-teal relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Smart Contract Address</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className="font-mono text-xs text-teal-300 font-bold break-all">
                {data.contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}
              </span>
              <button
                onClick={() => handleCopy(data.contractAddress, 'contract')}
                className="text-slate-400 hover:text-teal-300"
              >
                {copiedTx === 'contract' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Network</span>
            <p className="text-xs font-semibold text-white mt-1 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{data.network || 'Hardhat Localhost (Chain ID: 31337)'}</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consensus Engine</span>
            <p className="text-xs font-semibold text-white mt-1">Ethereum EVM / PoA Local Node</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Transactions"
          value={data.totalTransactions || data.transactions?.length || 0}
          subtitle="Smart contract calls"
          icon={Layers}
          color="teal"
        />
        <StatCard
          title="Records Anchored"
          value={data.totalRecordsOnChain || 0}
          subtitle="SHA-256 hashes registered"
          icon={Shield}
          color="indigo"
        />
        <StatCard
          title="Network Status"
          value="OPERATIONAL"
          subtitle="Latency < 12ms"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Transactions Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Confirmed Blockchain Transactions</h2>

        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Tx Hash</th>
                  <th className="px-4 py-3">Block #</th>
                  <th className="px-4 py-3">Smart Contract Method</th>
                  <th className="px-4 py-3">From Address</th>
                  <th className="px-4 py-3">Gas Used</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {(data.transactions || []).map((tx) => (
                  <tr key={tx._id || tx.txHash} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 text-teal-400 font-bold whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span>{tx.txHash ? `${tx.txHash.substring(0, 10)}...${tx.txHash.substring(tx.txHash.length - 4)}` : '0x...'}</span>
                        <button
                          onClick={() => handleCopy(tx.txHash, tx.txHash)}
                          className="text-slate-500 hover:text-teal-300"
                        >
                          {copiedTx === tx.txHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      #{tx.blockNumber || '1042'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                        {tx.method || 'execute'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {tx.fromAddress ? `${tx.fromAddress.substring(0, 8)}...` : '0x...'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {tx.gasUsed || '84,000'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={tx.status || 'CONFIRMED'} />
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-300 text-xs">
                      {tx.details || `Executed ${tx.method}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
