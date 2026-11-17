import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const GrowthXLogo: React.FC<LogoProps> = ({ size = 'md', className = '', showText = false }) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 'w-4 h-4', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', icon: 'w-5 h-5', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', icon: 'w-8 h-8', text: 'text-2xl', sub: 'text-xs' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Dynamic Geometric GrowthX Logo Mark */}
      <div
        className={`${current.box} rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] p-[1px] shadow-lg shadow-emerald-500/20 shrink-0 flex items-center justify-center relative overflow-hidden group`}
      >
        <div className="w-full h-full bg-[#0d0e14] rounded-2xl flex items-center justify-center relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-transparent to-teal-400/20" />
          
          {/* Stylized Ascending 'X' SVG with Built-in Growth Arrow */}
          <svg
            className={`${current.icon} relative z-10 text-emerald-400 transition-transform duration-300 group-hover:scale-105`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Base Left Bar with Growth Nodes */}
            <path
              d="M5 19L19 5"
              stroke="url(#gx-gradient)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Cross Bar with Ascending Arrowhead */}
            <path
              d="M19 19L12 12"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M5 5L9 9"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Top-Right Growth Arrow Head */}
            <path
              d="M13 5H19V11"
              stroke="url(#gx-gradient)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="gx-gradient" x1="5" y1="19" x2="19" y2="5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#34d399" />
                <stop offset="0.5" stopColor="#10b981" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className={`font-black tracking-tight text-white ${current.text} flex items-center`}>
            <span>Growth</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 ml-0.5">
              X
            </span>
          </div>
          <span className={`text-gray-400 block font-medium tracking-wide ${current.sub}`}>
            Private Growth Terminal
          </span>
        </div>
      )}
    </div>
  );
};
