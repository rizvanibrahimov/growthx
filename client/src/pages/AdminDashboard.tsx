import React, { useEffect, useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, DollarSign, CheckCircle, 
  XCircle, Clock, TrendingUp, RefreshCw, ChevronRight, Activity, ArrowUpRight, ArrowDownRight,
  Trash2, AlertTriangle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [balanceForm, setBalanceForm] = useState({ action: 'DEPOSIT', amount: '', reason: '' });
  const [tradeForm, setTradeForm] = useState({
    asset: 'BTC/USDT',
    direction: 'BUY',
    leverage: '20x',
    margin: '',
    entryPrice: '',
    exitPrice: '',
    profitLoss: '',
    notes: 'Telegram trade signal'
  });

  const fetchData = async () => {
    try {
      const [usersRes, withRes] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/withdrawals'),
      ]);
      setUsers(usersRes.data.data);
      setWithdrawals(withRes.data.data);
      if (selectedUser) {
        const updated = usersRes.data.data.find((u: any) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh investor presence and updates every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [selectedUser?.id]);

  // Online check: active within last 2 minutes (120,000 ms)
  const isUserOnline = (user: any) => {
    if (!user || !user.lastActivity) return false;
    const diff = Date.now() - new Date(user.lastActivity).getTime();
    return diff < 120000;
  };

  const formatLastSeen = (user: any) => {
    if (!user.lastLogin && !user.lastActivity) return 'Never';
    const target = user.lastActivity || user.lastLogin;
    const diffSec = Math.floor((Date.now() - new Date(target).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(target).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never logged in';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      const res = await API.delete(`/admin/users/${selectedUser.id}`);
      if (res.data.success) {
        toast.success(`Investor account "${selectedUser.fullName}" deleted`);
        setShowDeleteUser(false);
        setSelectedUser(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const res = await API.post('/admin/users', newUser);
      if (res.data.success) {
        toast.success(`Investor account created: ${newUser.fullName}`);
        setNewUser({ fullName: '', email: '', password: '', phone: '' });
        setShowAddUser(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create investor account');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const amount = parseFloat(balanceForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const res = await API.post(`/admin/users/${selectedUser.id}/balance`, {
        action: balanceForm.action,
        amount,
        reason: balanceForm.reason,
      });
      if (res.data.success) {
        toast.success('Investor balance updated successfully');
        setShowAddBalance(false);
        setBalanceForm({ action: 'DEPOSIT', amount: '', reason: '' });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update balance');
    }
  };

  const updateTradeFormField = (field: string, value: any) => {
    const updated: any = { ...tradeForm, [field]: value };

    // Auto-calculate PnL when margin, entry, exit, leverage, or direction changes
    const entry = parseFloat(field === 'entryPrice' ? value : updated.entryPrice);
    const exit = parseFloat(field === 'exitPrice' ? value : updated.exitPrice);
    const margin = parseFloat(field === 'margin' ? value : updated.margin);
    const lev = parseInt(String(field === 'leverage' ? value : updated.leverage).replace(/[^0-9]/g, ''), 10) || 1;
    const dir = (field === 'direction' ? value : updated.direction) === 'BUY' ? 1 : -1;

    if (!isNaN(entry) && entry > 0 && !isNaN(exit) && exit > 0) {
      const pricePct = ((exit - entry) / entry) * dir;
      if (!isNaN(margin) && margin > 0) {
        const calculatedPnL = margin * lev * pricePct;
        updated.profitLoss = (calculatedPnL >= 0 ? '+' : '') + calculatedPnL.toFixed(2);
      } else {
        const calculatedPnL = (exit - entry) * dir;
        updated.profitLoss = (calculatedPnL >= 0 ? '+' : '') + calculatedPnL.toFixed(2);
      }
    }

    setTradeForm(updated);
  };

  const handleRecordTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const entry = parseFloat(tradeForm.entryPrice);
    const exit = tradeForm.exitPrice ? parseFloat(tradeForm.exitPrice) : null;
    const margin = tradeForm.margin ? parseFloat(tradeForm.margin) : null;
    let pnl = parseFloat(tradeForm.profitLoss);

    if (isNaN(entry)) {
      toast.error('Please enter a valid entry price');
      return;
    }

    const lev = parseInt(tradeForm.leverage.replace(/[^0-9]/g, ''), 10) || 1;
    const dir = tradeForm.direction === 'BUY' ? 1 : -1;

    // Fallback calculate PnL if not explicitly filled
    if (isNaN(pnl) && exit !== null && !isNaN(exit)) {
      const pricePct = ((exit - entry) / entry) * dir;
      if (margin && !isNaN(margin)) {
        pnl = margin * lev * pricePct;
      } else {
        pnl = (exit - entry) * dir;
      }
    }

    if (isNaN(pnl)) {
      toast.error('Please enter settled PnL amount or exit price');
      return;
    }

    const qty = margin && entry > 0 ? (margin * lev) / entry : 1;
    const pnlPct = margin && margin > 0 ? (pnl / margin) * 100 : (exit ? (((exit - entry) / entry) * dir * lev * 100) : 0);

    try {
      const tradeRes = await API.post('/admin/trades', {
        userId: selectedUser.id,
        asset: tradeForm.asset,
        direction: tradeForm.direction,
        leverage: lev,
        margin: margin,
        entryPrice: entry,
        exitPrice: exit !== null ? exit : entry,
        quantity: qty,
        profitLoss: pnl,
        profitLossPercent: pnlPct,
        status: 'CLOSED',
        notes: tradeForm.notes,
      });

      if (tradeRes.data.success) {
        toast.success(`Trade settlement recorded! Balance updated (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`);
        setShowAddTrade(false);
        setTradeForm({
          asset: 'BTC/USDT',
          direction: 'BUY',
          leverage: '20x',
          margin: '',
          entryPrice: '',
          exitPrice: '',
          profitLoss: '',
          notes: 'Telegram trade signal'
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record trade');
    }
  };

  const handleWithdrawalAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await API.put(`/admin/withdrawals/${id}`, {
        status,
        adminNotes: status === 'APPROVED' ? 'Approved by administrator' : 'Rejected by administrator',
      });
      if (res.data.success) {
        toast.success(status === 'APPROVED' ? 'Withdrawal approved & balance deducted' : 'Withdrawal rejected');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading terminal...</div>;
  }

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administrator Terminal</h1>
          <p className="text-xs text-gray-400 mt-1">Manage investor balances, record Telegram trading outcomes, and approve payouts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Investor</span>
          </button>
          <button
            onClick={fetchData}
            className="bg-[#12131a] hover:bg-[#1a1c27] border border-[#1e2030] p-2.5 rounded-xl text-gray-400 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PENDING WITHDRAWALS ALERT */}
      {pendingWithdrawals.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-3">
            <Clock className="w-4 h-4" />
            <span>Pending Withdrawal Requests ({pendingWithdrawals.length})</span>
          </div>
          <div className="space-y-2">
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="bg-[#12131a] border border-[#1e2030] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-white">{w.user?.fullName}</span>
                  <span className="text-gray-400 ml-2">({w.user?.email})</span>
                  <div className="text-gray-300 mt-0.5">
                    Amount: <b className="text-emerald-400 font-mono">${w.amount.toFixed(2)}</b> | Method: {w.method} | Destination: <span className="font-mono text-gray-400">{w.destination}</span>
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5 font-mono">
                    Requested: {new Date(w.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleWithdrawalAction(w.id, 'APPROVED')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleWithdrawalAction(w.id, 'REJECTED')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investor List (Left 2 cols) */}
        <div className="lg:col-span-2 bg-[#12131a] border border-[#1e2030] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white">Registered Investors</h2>
            </div>
            <span className="text-xs text-gray-400">{users.length} accounts</span>
          </div>

          <div className="space-y-2.5">
            {users.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-[#1e2030] rounded-xl">
                No investors found. Click "New Investor" to register your first client.
              </div>
            ) : (
              users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const online = isUserOnline(u);
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500'
                        : 'bg-[#0a0b0f] border-[#1e2030] hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {/* Status Pulse Indicator */}
                        <span className="relative flex h-2.5 w-2.5">
                          {online ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </>
                          ) : (
                            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-gray-600"></span>
                          )}
                        </span>

                        <span className="font-bold text-white text-sm">{u.fullName}</span>
                        <span className="text-xs text-gray-400">({u.email})</span>

                        {online ? (
                          <span className="text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            ONLINE
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatLastSeen(u)}
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-[9px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.2 rounded">
                            SELECTED
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
                        <span>Last Login: <b className="text-gray-300 font-normal">{formatFullDate(u.lastLogin)}</b></span>
                        <span className="text-gray-600">•</span>
                        <span>Trades: {u._count?.trades || 0}</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Live Balance</div>
                        <div className="text-base font-bold text-emerald-400 font-mono">
                          ${u.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Investor Action Panel (Right 1 col) */}
        <div>
          {selectedUser ? (
            <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Account</span>
                  {isUserOnline(selectedUser) ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ONLINE NOW
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700/50 font-mono">
                      Last seen {formatLastSeen(selectedUser)}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white">{selectedUser.fullName}</h3>
                <div className="text-xs text-gray-400 font-mono">{selectedUser.email}</div>
                {selectedUser.phone && (
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">Phone: {selectedUser.phone}</div>
                )}
                
                {/* Client Visible Balance */}
                <div className="mt-3 bg-[#0a0b0f] p-3.5 rounded-xl border border-[#1e2030]">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Client's Visible Balance</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    ${selectedUser.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Login & Activity Metadata */}
                <div className="mt-2.5 bg-[#0a0b0f] p-3 rounded-xl border border-[#1e2030] space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Login:</span>
                    <span className="text-gray-200 font-mono font-medium">{formatFullDate(selectedUser.lastLogin)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1e2030] pt-1.5">
                    <span className="text-gray-400">Registered:</span>
                    <span className="text-gray-400 font-mono">{formatFullDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setShowAddTrade(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Log Telegram Trade Result</span>
                </button>

                <button
                  onClick={() => setShowAddBalance(true)}
                  className="w-full bg-[#1e2030] hover:bg-[#282b3f] text-gray-200 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Deposit / Withdraw Balance</span>
                </button>

                {/* DELETE ACCOUNT BUTTON */}
                <button
                  onClick={() => setShowDeleteUser(true)}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs mt-3"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Investor Account</span>
                </button>
              </div>

              <div className="text-xs text-gray-400 bg-[#0a0b0f] p-3 rounded-xl border border-[#1e2030] space-y-1">
                <div className="font-semibold text-gray-300">💡 Workflow Guide:</div>
                <p className="text-[11px] text-gray-400">
                  When trading for this client on Telegram, click <b>"Log Telegram Trade Result"</b> when closing a position. Enter the PnL amount (e.g. +$250 or -$80) and the client's balance and trade ledger will update automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-8 text-center text-gray-500">
              <Activity className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-xs">Select an investor from the list to update balances or log trades.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW INVESTOR */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-[#262a40] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Investor Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST BALANCE (NO NATIVE SELECT) */}
      {showAddBalance && selectedUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-[#262a40] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Adjust Balance: {selectedUser.fullName}</h3>
            <form onSubmit={handleAdjustBalance} className="space-y-4">
              {/* MODERN ACTION SELECTOR PILLS */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Action Type</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0b0f] border border-[#1e2030] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, action: 'DEPOSIT' })}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      balanceForm.action === 'DEPOSIT' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Deposit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, action: 'WITHDRAWAL' })}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      balanceForm.action === 'WITHDRAWAL' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Withdraw (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, action: 'ADJUSTMENT' })}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      balanceForm.action === 'ADJUSTMENT' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Adjustment
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount ($ USD)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 500.00"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value.replace(/[^0-9.]/g, '') })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Ledger Reason (Visible to Client)</label>
                <input
                  type="text"
                  placeholder="e.g. USDT deposit received via TRC-20"
                  value={balanceForm.reason}
                  onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBalance(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG TELEGRAM TRADE RESULT (NO NATIVE SELECT) */}
      {showAddTrade && selectedUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-[#262a40] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Log Telegram Trade Result</h3>
              <p className="text-xs text-gray-400 mt-0.5">Recording settlement for <b>{selectedUser.fullName}</b>. Net profit/loss will directly apply to client balance.</p>
            </div>

            <form onSubmit={handleRecordTrade} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Asset Symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="BTC/USDT"
                    value={tradeForm.asset}
                    onChange={(e) => updateTradeFormField('asset', e.target.value.toUpperCase())}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Leverage</label>
                  <input
                    type="text"
                    placeholder="20x"
                    value={tradeForm.leverage}
                    onChange={(e) => updateTradeFormField('leverage', e.target.value)}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* MODERN LONG / SHORT PILL BUTTONS */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Position Direction</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#0a0b0f] border border-[#1e2030] rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateTradeFormField('direction', 'BUY')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                      tradeForm.direction === 'BUY' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> LONG (Buy)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTradeFormField('direction', 'SELL')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                      tradeForm.direction === 'SELL' 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> SHORT (Sell)
                  </button>
                </div>
              </div>

              {/* MARGIN & ENTRY PRICE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Margin ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 100 or 500"
                    value={tradeForm.margin}
                    onChange={(e) => updateTradeFormField('margin', e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Position investment</span>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Entry Price ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="e.g. 95000"
                    value={tradeForm.entryPrice}
                    onChange={(e) => updateTradeFormField('entryPrice', e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Entry coin price</span>
                </div>
              </div>

              {/* EXIT PRICE & NET PNL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Exit Price ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 98200"
                    value={tradeForm.exitPrice}
                    onChange={(e) => updateTradeFormField('exitPrice', e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Closing price</span>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Net Settled PnL ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="e.g. +67.50 or -30.00"
                    value={tradeForm.profitLoss}
                    onChange={(e) => setTradeForm({ ...tradeForm, profitLoss: e.target.value.replace(/[^0-9.-]/g, '') })}
                    className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Auto or manual PnL</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Trade Notes / Strategy</label>
                <input
                  type="text"
                  placeholder="e.g. Scalp trade closed at target 2"
                  value={tradeForm.notes}
                  onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrade(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded-xl"
                >
                  Settle Trade & Credit Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE INVESTOR CONFIRMATION */}
      {showDeleteUser && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Investor Account?</h3>
                <p className="text-xs text-rose-400/90">This action is permanent and irreversible.</p>
              </div>
            </div>

            <div className="bg-[#0a0b0f] p-3.5 rounded-xl border border-[#1e2030] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Investor:</span>
                <span className="font-bold text-white">{selectedUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="font-mono text-gray-300">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Available Balance:</span>
                <span className="font-mono text-emerald-400 font-bold">${selectedUser.availableBalance.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Deleting this account will permanently remove this user along with all associated trade records, deposit/withdrawal requests, and balance history logs from the database.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteUser(false)}
                className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white bg-[#1e2030] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUser}
                className="bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Yes, Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
