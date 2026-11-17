import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GrowthXLogo } from './GrowthXLogo';

export const Navbar: React.FC = () => {
  const { name, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0d0e14]/90 backdrop-blur-md border-b border-[#1e2030] px-4 py-2.5">
      <div className="max-w-lg md:max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GrowthXLogo size="sm" showText={false} />
          <div>
            <div className="font-extrabold text-white tracking-tight text-sm flex items-center leading-none">
              <span>Growth</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 ml-0.5">
                X
              </span>
            </div>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {role === 'admin' ? 'Master Terminal' : 'Private Growth Desk'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#12131a] border border-[#1e2030] px-2.5 py-1 rounded-xl text-xs">
            {role === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="font-medium text-gray-200 max-w-[100px] truncate">{name}</span>
            <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-[#1e2030] text-gray-400">
              {role === 'admin' ? 'ADMIN' : 'USER'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-gray-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-[#1a1c27] transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
