import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { GrowthXLogo } from '../components/GrowthXLogo';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, role, name } = res.data.data;
        login(token, role, name);
        toast.success(`Welcome back, ${name}`);
        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0b0f] p-4">
      <div className="w-full max-w-md bg-[#12131a] border border-[#1e2030] rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <GrowthXLogo size="lg" showText={false} className="mb-3" />
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center">
            <span>Growth</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 ml-0.5">
              X
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Private Execution & Capital Growth Terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0b0f] border border-[#1e2030] rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
