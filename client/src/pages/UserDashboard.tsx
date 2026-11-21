import React, { useEffect, useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, 
  Clock, CheckCircle, AlertCircle, RefreshCw, Send,
  Layers, ArrowUpCircle, History, ChevronRight
} from 'lucide-react';

interface NetworkOption {
  id: string;
  name: string;
  sub: string;
  fee: number;
  placeholder: string;
  inputLabel: string;
  badge?: string;
  icon: React.ReactNode;
}

export const UserDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'trades' | 'withdraw' | 'history'>('home');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);

  // Networks matching user specification: BEP20, TRC20 ($1 fee), Binance ID with real uploaded icons
  const NETWORKS: NetworkOption[] = [
    {
      id: 'TRON (TRC20)',
      name: 'TRON (TRC20)',
      sub: 'TRON Network',
      fee: 1.0,
      badge: '$1.00 Fee',
      inputLabel: 'TRC20 Wallet Address',
      placeholder: 'Enter your USDT TRC20 address',
      icon: (
        <img 
          src="/icons/tron.png?v=2" 
          alt="TRON" 
          className="w-9 h-9 rounded-full object-contain shrink-0 drop-shadow"
        />
      )
    },
    {
      id: 'BNB Smart Chain (BEP20)',
      name: 'BNB Smart Chain (BEP20)',
      sub: 'BNB Network',
      fee: 0,
      inputLabel: 'BEP20 Wallet Address',
      placeholder: 'Enter your USDT BEP20 address',
      icon: (
        <img 
          src="/icons/bnb.png?v=2" 
          alt="BNB Smart Chain" 
          className="w-9 h-9 rounded-full object-contain shrink-0 drop-shadow"
        />
      )
    },
    {
      id: 'Binance ID (UID)',
      name: 'Binance Pay (UID)',
      sub: 'Binance ID Transfer',
      fee: 0,
      inputLabel: 'Binance User ID (UID)',
      placeholder: 'Enter your Binance Pay UID',
      icon: (
        <img 
          src="/icons/binance.png?v=2" 
          alt="Binance" 
          className="w-9 h-9 rounded-full object-contain shrink-0 drop-shadow"
        />
      )
    }
  ];

  // Selected Network
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(NETWORKS[0]);

  // Form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, tradesRes, withRes, histRes] = await Promise.all([
        API.get('/user/dashboard'),
        API.get('/user/trades'),
        API.get('/user/withdrawals'),
        API.get('/user/balance-history'),
      ]);
      setData(dashRes.data.data);
      setTrades(tradesRes.data.data);
      setWithdrawals(withRes.data.data);
      setBalanceHistory(histRes.data.data);
    } catch (err) {
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Send heartbeat immediately and every 30 seconds while user is active
    const sendHeartbeat = () => {
      API.post('/user/heartbeat').catch(() => {});
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeatInterval);
  }, []);

  const parsedAmount = parseFloat(withdrawAmount) || 0;
  const receiveAmount = parsedAmount > selectedNetwork.fee ? parsedAmount - selectedNetwork.fee : 0;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal amount is $100.00');
      return;
    }

    if (amount > (data?.balance?.available || 0)) {
      toast.error('Insufficient available balance');
      return;
    }

    const trimmedAddress = withdrawAddress.trim();
    if (!trimmedAddress) {
      toast.error(`Please enter your ${selectedNetwork.inputLabel}`);
      return;
    }

    // Network-specific address validation
    if (selectedNetwork.id === 'TRON (TRC20)') {
      const trcRegex = /^T[1-9A-HJ-NP-za-km-z]{33}$/;
      if (!trcRegex.test(trimmedAddress)) {
        if (!trimmedAddress.startsWith('T')) {
          toast.error('Invalid TRC20 address. It must start with capital "T".');
        } else if (trimmedAddress.length !== 34) {
          toast.error(`Invalid TRC20 address length. Expected 34 characters, got ${trimmedAddress.length}.`);
        } else {
          toast.error('Invalid TRC20 address format. Contains invalid characters.');
        }
        return;
      }
    } else if (selectedNetwork.id === 'BNB Smart Chain (BEP20)') {
      const bepRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!bepRegex.test(trimmedAddress)) {
        if (!trimmedAddress.startsWith('0x')) {
          toast.error('Invalid BEP20 address. It must start with "0x".');
        } else if (trimmedAddress.length !== 42) {
          toast.error(`Invalid BEP20 address length. Expected 42 characters, got ${trimmedAddress.length}.`);
        } else {
          toast.error('Invalid BEP20 address format. Only hexadecimal characters (0-9, a-f) are allowed.');
        }
        return;
      }
    } else if (selectedNetwork.id === 'Binance ID (UID)') {
      const uidRegex = /^\d{8,10}$/;
      if (!uidRegex.test(trimmedAddress)) {
        if (/[^0-9]/.test(trimmedAddress)) {
          toast.error('Invalid Binance UID. It must contain only numbers (no letters or spaces).');
        } else {
          toast.error(`Invalid Binance UID length. Expected 8 to 10 digits, got ${trimmedAddress.length}.`);
        }
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await API.post('/user/withdrawal', {
        amount,
        method: `Tether USDT (${selectedNetwork.id})`,
        destination: trimmedAddress,
      });

      if (res.data.success) {
        toast.success('Withdrawal request submitted! Awaiting administrator approval.');
        setWithdrawAmount('');
        setWithdrawAddress('');
        fetchData();
        setActiveTab('withdraw');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[85vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-gray-400 text-sm font-medium">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  const availableBalance = data?.balance?.available || 0;
  const netPnL = data?.stats?.netPnL || 0;

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-28 px-4 pt-4">
      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Live Portfolio</span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-[#12131a] active:scale-95 transition border border-[#1e2030] px-3 py-1.5 rounded-full"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* MOBILE TAB NAVIGATION PILLS */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#12131a] border border-[#1e2030] rounded-2xl mb-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('home')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'home' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'trades' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          Trades ({trades.length})
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'withdraw' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          Withdraw
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'history' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'text-gray-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'home' && (
        <div className="space-y-5">
          {/* PRIMARY BALANCE CARD */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#161a29] via-[#12141f] to-[#0c0d14] border border-[#262a40] shadow-2xl">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-blue-400" />
                Available Balance (USDT)
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                ACTIVE
              </span>
            </div>

            {/* BALANCE AMOUNT */}
            <div className="text-4xl font-extrabold text-white tracking-tight font-mono my-2">
              ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* PnL STATUS */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1e2238]/60 text-xs">
              <span className="text-gray-400">Total Net Return:</span>
              <div className={`font-bold flex items-center gap-1 ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netPnL >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{netPnL >= 0 ? '+' : ''}${netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">Win Rate: {data?.stats?.winRate || 0}%</span>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setActiveTab('withdraw')}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Withdraw Funds</span>
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className="w-full bg-[#1e2238] hover:bg-[#282d4a] active:scale-95 text-gray-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-[#2d3352]"
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>My Trades</span>
              </button>
            </div>
          </div>

          {/* STATS STRIP */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#12131a] border border-[#1e2030] p-3 rounded-2xl">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Trades</div>
              <div className="text-lg font-bold text-white mt-0.5">{data?.stats?.totalTrades || 0}</div>
            </div>
            <div className="bg-[#12131a] border border-[#1e2030] p-3 rounded-2xl">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Open Positions</div>
              <div className="text-lg font-bold text-blue-400 mt-0.5">{data?.stats?.openTrades || 0}</div>
            </div>
            <div className="bg-[#12131a] border border-[#1e2030] p-3 rounded-2xl">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Closed Trades</div>
              <div className="text-lg font-bold text-gray-300 mt-0.5">{data?.stats?.closedTrades || 0}</div>
            </div>
          </div>

          {/* RECENT TRADES PREVIEW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Recent Positions</span>
              <button
                onClick={() => setActiveTab('trades')}
                className="text-xs text-blue-400 flex items-center gap-0.5 font-medium"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {trades.length === 0 ? (
              <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-8 text-center text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-xs font-medium text-gray-400">No trading activity yet.</p>
                <p className="text-[11px] text-gray-500 mt-1">Positions executed with your account manager will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trades.slice(0, 3).map((trade) => renderTradeCard(trade))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: TRADES --- */}
      {activeTab === 'trades' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Trade History</h2>
            <p className="text-xs text-gray-400 mt-0.5">All positions recorded by your portfolio manager</p>
          </div>

          {trades.length === 0 ? (
            <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-10 text-center text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium text-gray-300">No Trading Records</p>
              <p className="text-xs text-gray-500 mt-1">
                Your trades will appear here as soon as they are logged and settled by the administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trades.map((trade) => renderTradeCard(trade))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: WITHDRAW (EXACT DESIGN MATCHING USER MOCKUP) --- */}
      {activeTab === 'withdraw' && (
        <div className="space-y-5">
          <div className="bg-[#12131a] border border-[#1e2030] rounded-3xl p-5 space-y-5 shadow-2xl">
            
            {/* 1. HEADER: WITHDRAW CRYPTO */}
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Withdraw Crypto</h2>
              <span className="text-xs text-gray-400 block mt-0.5">Select cryptocurrency</span>
            </div>

            {/* 2. CRYPTO DISPLAY CARD (Real Uploaded Tether USDT Icon & Details) */}
            <div className="flex items-center justify-between p-3.5 bg-[#0a0b0f] border border-[#1e2030] rounded-2xl">
              <div className="flex items-center gap-3">
                <img 
                  src="/icons/usdt.png?v=2" 
                  alt="Tether USDT" 
                  className="w-10 h-10 rounded-full object-contain shrink-0 drop-shadow"
                />
                <div>
                  <div className="text-sm font-bold text-white tracking-wide">Tether (USDT)</div>
                  <div className="text-xs text-gray-400">Tether USD</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
                Available
              </span>
            </div>

            {/* 3. SELECT NETWORK SECTION (BEP20, TRC20, Binance ID) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Select Network
              </label>

              <div className="space-y-2">
                {NETWORKS.map((network) => {
                  const isSelected = selectedNetwork.id === network.id;
                  return (
                    <div
                      key={network.id}
                      onClick={() => setSelectedNetwork(network)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition border ${
                        isSelected
                          ? 'bg-[#151824] border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-[#0a0b0f] border-[#1e2030] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {network.icon}
                        <div>
                          <div className="text-xs font-bold text-white tracking-wide">{network.name}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <span>{network.sub}</span>
                            {network.badge && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded">
                                {network.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selection Status Badge (Matching Screenshot: green "Selected" badge) */}
                      {isSelected ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          Selected
                        </span>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4 pt-1">
              {/* 4. WALLET ADDRESS / BINANCE ID INPUT */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {selectedNetwork.inputLabel}
                </label>
                <input
                  type="text"
                  placeholder={selectedNetwork.placeholder}
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-2xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
                />
              </div>

              {/* 5. WITHDRAWAL AMOUNT INPUT */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">Withdrawal Amount (USDT)</label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Available: ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="relative flex items-center bg-[#0a0b0f] border border-[#1e2030] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 rounded-2xl px-3.5 py-3 transition">
                  <span className="text-gray-500 font-bold text-base mr-2 font-mono select-none">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setWithdrawAmount(val);
                    }}
                    className="w-full bg-transparent text-white text-base font-bold font-mono focus:outline-none placeholder:text-gray-600"
                  />
                  <span className="text-[11px] font-bold text-gray-300 bg-[#161826] px-2.5 py-1 rounded-lg border border-[#24283b] shrink-0 select-none">
                    USDT
                  </span>
                </div>

                {/* Quick Shortcut Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount('100')}
                    className="py-1.5 bg-[#161826] hover:bg-[#202336] active:scale-95 rounded-xl text-[11px] font-semibold text-gray-300 border border-[#202336] transition"
                  >
                    $100 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount((availableBalance * 0.25).toFixed(2))}
                    className="py-1.5 bg-[#161826] hover:bg-[#202336] active:scale-95 rounded-xl text-[11px] font-semibold text-gray-300 border border-[#202336] transition"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount((availableBalance * 0.50).toFixed(2))}
                    className="py-1.5 bg-[#161826] hover:bg-[#202336] active:scale-95 rounded-xl text-[11px] font-semibold text-gray-300 border border-[#202336] transition"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(availableBalance.toFixed(2))}
                    className="py-1.5 bg-blue-600/15 hover:bg-blue-600/25 active:scale-95 rounded-xl text-[11px] font-bold text-blue-400 border border-blue-500/30 transition"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* 6. RECEIVE AMOUNT & TRC20 FEE CALCULATION */}
              <div className="bg-[#0a0b0f] border border-[#1e2030] p-3 rounded-2xl text-xs space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Minimum Threshold:</span>
                  <span className="font-semibold text-white font-mono">$100.00 USDT</span>
                </div>

                {selectedNetwork.fee > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Network Fee (TRC20):</span>
                    <span className="font-semibold text-amber-400 font-mono">$1.00 USDT</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-200 pt-1.5 border-t border-[#1e2030] font-bold">
                  <span>You will receive:</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    ${receiveAmount.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* 7. CONFIRM BUTTON */}
              <button
                type="submit"
                disabled={submitting || availableBalance < 100}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Confirm Withdrawal'}</span>
              </button>
            </form>
          </div>

          {/* WITHDRAWAL HISTORY */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Withdrawal History</h3>
            {withdrawals.length === 0 ? (
              <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-6 text-center text-xs text-gray-500">
                No withdrawal requests found.
              </div>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="bg-[#12131a] border border-[#1e2030] p-3.5 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white font-mono text-sm">${w.amount.toFixed(2)} USDT</div>
                    <div className="text-gray-400 text-[11px] mt-0.5">{w.method}</div>
                    <div className="text-gray-500 text-[10px] truncate max-w-[180px] font-mono">{w.destination}</div>
                  </div>
                  <div className="text-right">
                    {w.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {w.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {w.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                        <AlertCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    <div className="text-gray-400 text-[11px] mt-1 flex items-center justify-end gap-1 font-mono">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {new Date(w.requestedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: BALANCE AUDIT HISTORY --- */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-white">Balance Ledger</h2>
            <p className="text-xs text-gray-400">Complete audit log of all deposits, withdrawals, and trade settlements</p>
          </div>

          {balanceHistory.length === 0 ? (
            <div className="bg-[#12131a] border border-[#1e2030] rounded-2xl p-8 text-center text-xs text-gray-500">
              No balance transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {balanceHistory.map((item) => {
                const isPositive = item.action === 'DEPOSIT' || item.action === 'TRADE_PROFIT' || item.action === 'REFUND';
                return (
                  <div key={item.id} className="bg-[#12131a] border border-[#1e2030] p-3 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">
                        {item.action === 'DEPOSIT' && 'Deposit'}
                        {item.action === 'WITHDRAWAL' && 'Withdrawal'}
                        {item.action === 'TRADE_PROFIT' && 'Trade Profit'}
                        {item.action === 'TRADE_LOSS' && 'Trade Loss'}
                        {item.action === 'REFUND' && 'Withdrawal Refund'}
                        {item.action === 'ADJUSTMENT' && 'Balance Adjustment'}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{item.reason || 'System ledger record'}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5 text-gray-600" />
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold font-mono text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : '-'}${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        Balance: ${item.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- MOBILE BOTTOM NAVIGATION BAR --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2030] z-50 px-4 py-2 flex justify-around max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'home' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('trades')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'trades' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Trades</span>
        </button>

        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'withdraw' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <ArrowUpCircle className="w-5 h-5" />
          <span className="text-[10px]">Withdraw</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'history' ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">History</span>
        </button>
      </nav>
    </div>
  );

  // MOBILE TRADE CARD RENDERER
  function renderTradeCard(trade: any) {
    const isProfit = trade.profitLoss >= 0;
    const isBuy = trade.direction === 'BUY' || trade.direction === 'LONG';

    return (
      <div
        key={trade.id}
        className="bg-[#12131a] border border-[#1e2030] p-4 rounded-2xl space-y-2 hover:border-[#282d42] transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm tracking-wide">{trade.asset}</span>
            {trade.leverage && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                {typeof trade.leverage === 'number' ? `${trade.leverage}x` : trade.leverage}
              </span>
            )}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
              isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isBuy ? 'LONG' : 'SHORT'}
            </span>
          </div>

          <div>
            {trade.status === 'CLOSED' ? (
              <div className="text-right">
                <span className={`font-mono font-bold text-sm block ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}${trade.profitLoss?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {trade.profitLossPercent !== null && trade.profitLossPercent !== undefined && (
                  <span className={`text-[10px] font-mono block font-semibold ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                    {isProfit ? '+' : ''}{Number(trade.profitLossPercent).toFixed(1)}%
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Open Position
              </span>
            )}
          </div>
        </div>

        {/* PRICE & DATE DETAILS */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs text-gray-400 pt-1 border-t border-[#1e2030]/50 font-mono">
          <div>
            <span className="text-[10px] text-gray-500 block">ENTRY</span>
            <span className="text-gray-200">${trade.entryPrice?.toLocaleString('en-US')}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block">EXIT</span>
            <span className="text-gray-200">{trade.exitPrice ? `$${trade.exitPrice.toLocaleString('en-US')}` : '—'}</span>
          </div>
          {trade.margin && (
            <div>
              <span className="text-[10px] text-gray-500 block">MARGIN</span>
              <span className="text-gray-200">${trade.margin?.toLocaleString('en-US')}</span>
            </div>
          )}
          <div className="text-right col-span-1">
            <span className="text-[10px] text-gray-500 block">DATE</span>
            <span className="text-gray-300 text-[11px] block">
              {new Date(trade.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </span>
          </div>
        </div>

        {trade.notes && (
          <div className="text-[11px] text-gray-500 bg-[#0a0b0f] px-2.5 py-1 rounded-lg">
            💬 {trade.notes}
          </div>
        )}
      </div>
    );
  }
};
