import React, { useState } from 'react';
import { Search, GitBranch, Bell, Palette, LogOut } from 'lucide-react';

interface TopNavbarProps {
  onSearchClick?: () => void;
  onNavigateScreen?: (screen: 'login' | 'theme' | 'editor') => void;
  activeFilePath?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onSearchClick,
  onNavigateScreen,
  activeFilePath = 'src / api',
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="top-navbar">
      {/* Left branding & path */}
      <div className="navbar-left">
        <div
          className="brand-logo-container"
          onClick={() => onNavigateScreen && onNavigateScreen('editor')}
          style={{ cursor: 'pointer' }}
        >
          <svg className="codeplane-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L2 8.5V15.5L12 22L22 15.5V8.5L12 2Z"
              fill="url(#logo-grad-1)"
              fillOpacity="0.25"
            />
            <path
              d="M12 2L3 8.5L12 14L21 8.5L12 2Z"
              fill="url(#logo-grad-2)"
            />
            <path
              d="M3 8.5V15.5L12 21.5V14L3 8.5Z"
              fill="url(#logo-grad-3)"
            />
            <path
              d="M21 8.5V15.5L12 21.5V14L21 8.5Z"
              fill="url(#logo-grad-4)"
            />
            <defs>
              <linearGradient id="logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#00e599" />
              </linearGradient>
              <linearGradient id="logo-grad-2" x1="3" y1="2" x2="21" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="logo-grad-3" x1="3" y1="8.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4f46e5" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="logo-grad-4" x1="21" y1="8.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#00e599" />
              </linearGradient>
            </defs>
          </svg>
          <span className="brand-name">Codeplane</span>
        </div>

        <div className="breadcrumb-path">
          <span>codeplane-core</span>
          <span className="path-sep">/</span>
          <span>src</span>
          <span className="path-sep">/</span>
          <span className="path-active">api</span>
        </div>
      </div>

      {/* Center search bar */}
      <div className="navbar-center" onClick={onSearchClick}>
        <div className="command-palette-input">
          <Search size={14} className="search-icon" />
          <span className="search-placeholder">Search files, commands, symbols...</span>
          <div className="shortcut-badge">
            <span className="key-symbol">⌘</span>
            <span className="key-char">K</span>
          </div>
        </div>
      </div>

      {/* Right status & profile indicators */}
      <div className="navbar-right">
        {/* Environment status */}
        <div className="env-status-badge">
          <span className="pulsing-green-dot"></span>
          <span className="env-name">prod-us-east</span>
          <span className="status-dot-sep">·</span>
          <span className="env-synced">synced</span>
        </div>

        {/* Git branch status */}
        <div className="git-status-badge">
          <GitBranch size={13} className="git-icon" />
          <span className="git-branch">main</span>
          <span className="status-dot-sep">·</span>
          <span className="git-clean">0 uncommitted</span>
        </div>

        {/* Theme studio shortcut */}
        <button
          className="nav-icon-button"
          title="Open Theme Studio"
          onClick={() => onNavigateScreen && onNavigateScreen('theme')}
        >
          <Palette size={15} />
        </button>

        {/* Notification Bell */}
        <button className="nav-icon-button notification-button" title="Notifications" aria-label="Notifications">
          <Bell size={15} />
          <span className="notification-dot"></span>
        </button>

        {/* User avatar & dropdown */}
        <div
          className="user-avatar-container"
          style={{ position: 'relative' }}
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&auto=format&fit=crop&q=80"
            alt="User profile"
            className="user-avatar"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="user-avatar-fallback">
                    <span>AP</span>
                  </div>
                `;
              }
            }}
          />

          {profileDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-info">
                <strong>Alex Parker</strong>
                <span>dev@company.com</span>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  if (onNavigateScreen) onNavigateScreen('theme');
                }}
              >
                <Palette size={13} />
                <span>Theme Studio</span>
              </button>
              <button
                className="dropdown-item logout"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  if (onNavigateScreen) onNavigateScreen('login');
                }}
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
