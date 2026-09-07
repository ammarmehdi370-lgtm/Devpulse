import React, { useState } from 'react';
import {
  Mail,
  Zap,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Terminal,
  Circle
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (email?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<string | null>(null);

  const handleLogin = (method: string) => {
    setIsLoading(true);
    setLoginMethod(method);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(email || 'dev@company.com');
    }, 700);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmail('dev@company.com');
    }
    handleLogin('Magic Link');
  };

  return (
    <div className="login-screen-wrapper">
      {/* Background Grid Accent */}
      <div className="login-grid-bg" />

      <div className="login-content-container">
        {/* LEFT COLUMN: Main Auth Card */}
        <div className="auth-card">
          {/* Card Header with Logo and Dev Preview Badge */}
          <div className="auth-card-header">
            <div className="auth-brand-row">
              <svg className="auth-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 8.5V15.5L12 22L22 15.5V8.5L12 2Z" fill="url(#auth-grad-1)" fillOpacity="0.3" />
                <path d="M12 2L3 8.5L12 14L21 8.5L12 2Z" fill="url(#auth-grad-2)" />
                <path d="M3 8.5V15.5L12 21.5V14L3 8.5Z" fill="url(#auth-grad-3)" />
                <path d="M21 8.5V15.5L12 21.5V14L21 8.5Z" fill="url(#auth-grad-4)" />
                <defs>
                  <linearGradient id="auth-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#00e599" />
                  </linearGradient>
                  <linearGradient id="auth-grad-2" x1="3" y1="2" x2="21" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818cf8" />
                    <stop offset="1" stopColor="#38bdf8" />
                  </linearGradient>
                  <linearGradient id="auth-grad-3" x1="3" y1="8.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="auth-grad-4" x1="21" y1="8.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#00e599" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="auth-brand-name">Codeplane</span>
            </div>

            <div className="dev-preview-badge">
              <span className="badge-dot"></span>
              <span>DEV PREVIEW v2.4</span>
            </div>
          </div>

          {/* Heading & Tagline */}
          <div className="auth-headings">
            <h1 className="auth-title">Build at the speed of thought.</h1>
            <p className="auth-subtitle">
              Sign in to access your cloud workspaces, ephemeral devboxes, and neural coding agents.
            </p>
          </div>

          {/* Auth Action Buttons */}
          <div className="auth-buttons-group">
            {/* GitHub Button */}
            <button
              className="oauth-btn github-btn"
              onClick={() => handleLogin('GitHub')}
              disabled={isLoading}
            >
              <svg className="btn-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>{isLoading && loginMethod === 'GitHub' ? 'Connecting...' : 'Continue with GitHub'}</span>
            </button>

            {/* GitLab Button */}
            <button
              className="oauth-btn dark-provider-btn"
              onClick={() => handleLogin('GitLab')}
              disabled={isLoading}
            >
              <svg className="btn-icon-svg gitlab-icon" viewBox="0 0 24 24" width="16" height="16" fill="#fc6d26">
                <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.918 1.263c-.136-.423-.731-.423-.867 0L1.387 9.45.045 13.587a.91.91 0 00.33.999L12 23.676l11.625-9.09a.91.91 0 00.33-.999" />
              </svg>
              <span>{isLoading && loginMethod === 'GitLab' ? 'Connecting...' : 'Continue with GitLab'}</span>
            </button>

            {/* SSO / SAML Button */}
            <button
              className="oauth-btn dark-provider-btn"
              onClick={() => handleLogin('SSO')}
              disabled={isLoading}
            >
              <KeyRound size={15} className="sso-icon" />
              <span>{isLoading && loginMethod === 'SSO' ? 'Verifying...' : 'Single Sign-On (SSO / SAML)'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR CONTINUE WITH WORK EMAIL</span>
            <span className="divider-line"></span>
          </div>

          {/* Email Magic Link Form */}
          <form className="email-auth-form" onSubmit={handleEmailSubmit}>
            <div className="email-input-wrapper">
              <Mail size={15} className="mail-input-icon" />
              <input
                type="email"
                placeholder="dev@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-text-input"
              />
            </div>

            <button type="submit" className="magic-link-btn" disabled={isLoading}>
              <span>{isLoading && loginMethod === 'Magic Link' ? 'Sending...' : 'Send Magic Link'}</span>
              <ArrowRight size={14} className="arrow-icon" />
            </button>
          </form>

          {/* Compliance & Security Row */}
          <div className="compliance-row">
            <div className="compliance-item">
              <span className="compliance-icon">⬡</span>
              <span>SOC2 Type II</span>
            </div>
            <span className="comp-sep">·</span>
            <div className="compliance-item">
              <span className="compliance-icon">⬡</span>
              <span>HIPAA Compliant</span>
            </div>
            <span className="comp-sep">·</span>
            <div className="compliance-item">
              <span className="compliance-icon">⬡</span>
              <span>Zero Query Retention</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Telemetry & Spinup Card */}
        <div className="auth-side-column">
          {/* Telemetry Daemon Box */}
          <div className="telemetry-daemon-box">
            <div className="daemon-box-header">
              <div className="daemon-dots-title">
                <span className="window-dots">•••</span>
                <span className="daemon-title">telemetry.daemon</span>
              </div>
              <div className="daemon-live-pill">
                <span className="live-pulsing-dot"></span>
                <span className="live-text">LIVE</span>
              </div>
            </div>

            <div className="daemon-terminal-content">
              <div className="term-line">
                <span className="term-tag">[HOST]</span>
                <span className="term-white"> node-alpha-71</span>
                <span className="term-ready">READY</span>
              </div>
              <div className="term-line">
                <span className="term-tag">[AUTH]</span>
                <span className="term-gray"> handshake protocol: </span>
                <span className="term-blue">mTLS-v1.3</span>
              </div>
              <div className="term-line">
                <span className="term-cyan">Connecting to cluster: </span>
                <span className="term-green-bright">us-east-1a</span>
              </div>
              <div className="term-line latency-line">
                <span className="term-gray">round-trip latency:</span>
                <span className="term-green-metric">14ms</span>
              </div>
              <div className="term-line lambda-line">
                <span className="term-cyan">λ orchestrator ephemeral instances available: </span>
                <span className="term-white">1,482</span>
              </div>
            </div>
          </div>

          {/* Sub-second Spinup Card */}
          <div className="spinup-feature-card">
            <div className="spinup-icon-box">
              <Zap size={16} className="spinup-bolt" />
            </div>
            <div className="spinup-text-info">
              <h3 className="spinup-title">Sub-second Spinup</h3>
              <p className="spinup-desc">
                Warm pre-provisioned Linux kernels resume in &lt;350ms globally.
              </p>
            </div>
          </div>

          {/* Footer Copyright and Links */}
          <footer className="auth-page-footer">
            <span className="footer-copyright">© Codeplane Cloud Inc.</span>
            <div className="footer-links">
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
              <span className="footer-sep">/</span>
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
              <span className="footer-sep">/</span>
              <a href="#system" onClick={(e) => e.preventDefault()}>System</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
