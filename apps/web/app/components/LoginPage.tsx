'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Terminal, 
  Zap, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [latency, setLatency] = useState(14);
  const [instances, setInstances] = useState(1482);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('');

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(9, Math.min(22, prev + delta));
      });
      if (Math.random() > 0.6) {
        setInstances(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      }
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (provider: string) => {
    setIsLoading(true);
    setLoginMethod(provider);
    setTimeout(() => {
      login(email || 'alex@codeplane.dev', 'Alex');
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-[#09090e] bg-grid-pattern relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#6C63FF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#0DF5C4]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[1080px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Card: Login Form */}
        <div className="lg:col-span-7 bg-[#111118]/90 backdrop-blur-xl border border-[#232334] rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/80 relative">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#6C63FF] to-[#8F87FF] flex items-center justify-center shadow-lg shadow-[#6C63FF]/30">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Codeplane</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0DF5C4]/10 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
              DEV PREVIEW v2.4
            </div>
          </div>

          {/* Headline & Description */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Build at the speed of thought.
          </h1>
          <p className="text-[#8c8ca5] text-sm sm:text-base mb-8 leading-relaxed">
            Sign in to access your cloud workspaces, ephemeral devboxes, and neural coding agents.
          </p>

          {/* Auth Providers */}
          <div className="space-y-3 mb-6">
            {/* Continue with GitHub (Primary Lavendar / Purple Button) */}
            <button
              onClick={() => handleLogin('github')}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#c4c0ff] hover:bg-[#b5afff] active:scale-[0.99] text-[#111118] font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-150 shadow-md shadow-[#6C63FF]/20"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{isLoading && loginMethod === 'github' ? 'Authenticating with GitHub...' : 'Continue with GitHub'}</span>
            </button>

            {/* Continue with GitLab */}
            <button
              onClick={() => handleLogin('gitlab')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#161622] hover:bg-[#1c1c2b] border border-[#2b2b3f] text-[#e0e0ec] font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-150"
            >
              <svg className="w-5 h-5 text-[#FC6D26]" viewBox="0 0 24 24" fill="currentColor">
                <path d="m23.6 9.57-.03-.08-3.48-8.87a.89.89 0 0 0-1.68 0L15.35 8H8.65L5.59.62a.89.89 0 0 0-1.68 0L.43 9.49l-.03.08a5.9 5.9 0 0 0 2.08 6.74L12 23.4l9.52-7.09a5.9 5.9 0 0 0 2.08-6.74Z" />
              </svg>
              <span>{isLoading && loginMethod === 'gitlab' ? 'Connecting GitLab...' : 'Continue with GitLab'}</span>
            </button>

            {/* Single Sign-On (SSO / SAML) */}
            <button
              onClick={() => handleLogin('sso')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#161622] hover:bg-[#1c1c2b] border border-[#2b2b3f] text-[#e0e0ec] font-medium text-sm flex items-center justify-center gap-3 transition-colors duration-150"
            >
              <KeyRound className="w-4 h-4 text-[#8c8ca5]" />
              <span>{isLoading && loginMethod === 'sso' ? 'Handshaking SAML...' : 'Single Sign-On (SSO / SAML)'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-[#232334] w-full" />
            <span className="bg-[#111118] px-3 font-mono text-[11px] uppercase tracking-wider text-[#666682] absolute">
              OR CONTINUE WITH WORK EMAIL
            </span>
          </div>

          {/* Email Input & Send Magic Link */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666682]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin('email')}
                placeholder="dev@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0b0b10] border border-[#27273a] text-white placeholder-[#585870] text-sm focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] transition-all font-mono"
              />
            </div>

            <button
              onClick={() => handleLogin('email')}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#1c1c28] hover:bg-[#252538] border border-[#31314a] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all group"
            >
              <span>{isLoading && loginMethod === 'email' ? 'Dispatching Magic Link...' : 'Send Magic Link'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Footer Security Badges */}
          <div className="mt-8 pt-6 border-t border-[#1d1d2c] flex flex-wrap items-center justify-center gap-6 text-[12px] font-mono text-[#777794]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0DF5C4]" />
              <span>SOC2 Type II</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#0DF5C4]" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#6C63FF]" />
              <span>Zero Query Retention</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Daemon & Feature Badges */}
        <div className="lg:col-span-5 space-y-6">
          {/* Telemetry Daemon Box */}
          <div className="bg-[#0b0b12] border border-[#222234] rounded-2xl p-6 font-mono text-xs shadow-2xl terminal-card relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1c1c2c]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="ml-2 text-[#8b8ba8] flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" />
                  telemetry.daemon
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0DF5C4]/10 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[10px] font-semibold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-ping" />
                LIVE
              </div>
            </div>

            {/* Terminal Lines */}
            <div className="space-y-2.5 leading-relaxed">
              <div className="flex justify-between">
                <span className="text-[#6C63FF]">[HOST]</span>
                <span className="text-[#a4a4c4]">node-alpha-71</span>
                <span className="text-[#FF9E64] font-semibold">READY</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6C63FF]">[AUTH]</span>
                <span className="text-[#a4a4c4]">handshake protocol:</span>
                <span className="text-white font-medium">mTLS-v1.3</span>
              </div>
              <div className="text-[#0DF5C4] pt-1">
                ☁ Connecting to cluster: <span className="underline">us-east-1a</span>
              </div>
              <div className="flex items-center justify-between text-[#8c8ca5] bg-[#13131f] p-2 rounded-lg border border-[#1f1f30]">
                <span>round-trip latency:</span>
                <span className="text-[#0DF5C4] font-bold text-sm font-mono">{latency}ms</span>
              </div>
              <div className="text-[#b5afff] pt-1 flex items-center gap-2">
                <span>λ orchestrator ephemeral instances available:</span>
                <span className="text-white font-bold">{instances.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sub-Second Spinup Card */}
          <div className="bg-[#12121c] border border-[#222232] rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/15 border border-[#6C63FF]/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#6C63FF]" />
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-1">Sub-second Spinup</h4>
              <p className="text-[#8c8ca5] text-xs leading-relaxed">
                Warm pre-provisioned Linux kernels resume in &lt;350ms globally.
              </p>
            </div>
          </div>

          {/* System Footer Links */}
          <div className="flex items-center justify-between text-xs text-[#5e5e78] font-mono px-2">
            <span>© Codeplane Cloud Inc.</span>
            <div className="flex gap-4">
              <button onClick={() => handleLogin('preview')} className="hover:text-[#a0a0c0] transition-colors">Privacy</button>
              <span>/</span>
              <button onClick={() => handleLogin('preview')} className="hover:text-[#a0a0c0] transition-colors">Terms</button>
              <span>/</span>
              <button onClick={() => handleLogin('preview')} className="hover:text-[#a0a0c0] transition-colors">System</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
