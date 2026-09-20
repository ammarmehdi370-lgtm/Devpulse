'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Layers, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Lock, 
  Unlock, 
  Terminal, 
  MessageSquare, 
  Radio, 
  Check, 
  X, 
  Wifi, 
  Share2, 
  Monitor, 
  Clock, 
  Users, 
  Activity,
  Maximize2
} from 'lucide-react';

export const RemoteControlPage: React.FC = () => {
  const { 
    theme, 
    setPage, 
    remoteCode, 
    updateRemoteCode, 
    isRemoteControlling, 
    setIsRemoteControlling,
    isRemoteMuted,
    setIsRemoteMuted,
    isRemoteCameraOn,
    setIsRemoteCameraOn
  } = useApp();

  const [seconds, setSeconds] = useState(872); // 00:14:32
  const [latency, setLatency] = useState(18);
  const [ahmedTyping, setAhmedTyping] = useState(true);

  // Timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Latency pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(17 + Math.floor(Math.random() * 3));
      setAhmedTyping(Math.random() > 0.3);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopSession = () => {
    if (confirm('Stop collaborative remote programming session?')) {
      setPage('editor');
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#07070c] text-white overflow-hidden font-sans select-none">
      
      {/* Top Remote Control Status Bar (Pixel-Perfect to Screenshot 2) */}
      <div className="h-12 bg-[#0c0c14] border-b border-[#1c1c2b] px-4 flex items-center justify-between shrink-0 font-mono text-xs z-30">
        
        {/* Left: Brand + Controlling Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#09090e] font-bold text-xs"
              style={{ backgroundColor: theme.primary }}
            >
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white hidden sm:inline">Codeplane</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-[#f43f5e] text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-ping" />
            LIVE
          </div>

          <div className="text-[#a4a4c6] font-medium hidden md:inline">
            Controlling: <strong className="text-white">Ahmed&apos;s Workspace</strong>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#0DF5C4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4]" />
            <span>us-east · {latency}ms latency · p2p direct</span>
          </div>
        </div>

        {/* Right: Timer, Participants, Stop Button */}
        <div className="flex items-center gap-4">
          <div className="px-2.5 py-1 rounded-lg bg-[#141420] border border-[#242436] text-[#0DF5C4] font-bold text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(seconds)}</span>
          </div>

          {/* Ahmed (Host) */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#1f1f2e]">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
              alt="Ahmed"
              className="w-6 h-6 rounded-full object-cover ring-1 ring-[#FF9E64]"
            />
            <div className="hidden lg:block text-left text-[10px] leading-tight">
              <div className="text-white font-semibold">Ahmed Al-Mansoor</div>
              <div className="text-[#FF9E64]">Host</div>
            </div>
          </div>

          {/* You (Alex) */}
          <div className="flex items-center gap-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
              alt="Alex"
              className="w-6 h-6 rounded-full object-cover ring-1 ring-[#6C63FF]"
            />
            <div className="hidden lg:block text-left text-[10px] leading-tight">
              <div className="text-white font-semibold">You (Alex)</div>
              <div className="text-[#6C63FF]">Controlling</div>
            </div>
          </div>

          {/* Stop Session Button */}
          <button
            onClick={handleStopSession}
            className="px-3 py-1 rounded-lg bg-[#f43f5e]/15 hover:bg-[#f43f5e]/25 border border-[#f43f5e]/40 text-[#f43f5e] font-semibold text-xs flex items-center gap-1 transition-colors"
          >
            <span>■</span>
            <span>Stop Session</span>
          </button>
        </div>
      </div>

      {/* Dual Split-Screen Collaborative Workspace (Pixel-Perfect to Screenshot 2) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1c1c2b] overflow-hidden">
        
        {/* Left Pane: YOUR VIEW (Alex) */}
        <div className="flex flex-col bg-[#09090f] overflow-hidden">
          {/* Sub-Header */}
          <div className="h-9 bg-[#0e0e16] border-b border-[#1c1c2b] px-3 flex items-center justify-between font-mono text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6C63FF]/20 text-[#c5c1ff] border border-[#6C63FF]/40">
                YOUR VIEW
              </span>

              {/* Tabs */}
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-[#141422] rounded text-white font-medium flex items-center gap-1">
                  <span className="text-[#FF9E64]">JS</span> index.js
                </span>
                <span className="px-2 py-1 text-[#6e6e88] hover:text-white cursor-pointer">
                  utils.js
                </span>
                <span className="px-2 py-1 text-[#6e6e88] hover:text-white cursor-pointer">
                  package.json
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#0DF5C4] flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3" /> Read & Write
              </span>
              <span className="text-[#8c8ca5]">Sync: 8ms lag</span>
            </div>
          </div>

          {/* Interactive Code Editor (Alex) */}
          <div className="flex-1 flex overflow-hidden font-mono text-xs relative">
            {/* Line Numbers */}
            <div className="w-10 bg-[#09090f] py-4 pr-2 text-right text-[#45455c] select-none border-r border-[#171722] shrink-0 space-y-1">
              {remoteCode.split('\n').map((_, i) => (
                <div key={i} className={`h-5 text-[11px] ${i + 1 === 16 ? 'text-[#0DF5C4] font-bold' : ''}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Content */}
            <div className="flex-1 relative overflow-auto p-4 bg-[#09090f]">
              <textarea
                value={remoteCode}
                onChange={(e) => updateRemoteCode(e.target.value)}
                spellCheck={false}
                className="w-full h-full bg-transparent text-[#d8d8e8] font-mono text-xs leading-5 resize-none focus:outline-none selection:bg-[#6C63FF]/30 select-text"
              />

              {/* Active User Cursor Tag overlay on line 16 */}
              <div className="absolute top-[310px] right-6 px-2 py-0.5 rounded bg-[#6C63FF] text-white text-[10px] font-mono font-bold shadow-md pointer-events-none">
                You (Alex)
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: AHMED'S SCREEN */}
        <div className="flex flex-col bg-[#09090f] overflow-hidden">
          {/* Sub-Header */}
          <div className="h-9 bg-[#0e0e16] border-b border-[#1c1c2b] px-3 flex items-center justify-between font-mono text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9E64]/20 text-[#FF9E64] border border-[#FF9E64]/40">
                AHMED&apos;S SCREEN
              </span>

              {/* Tabs */}
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-[#141422] rounded text-white font-medium flex items-center gap-1">
                  <span className="text-[#FF9E64]">JS</span> index.js
                </span>
              </div>

              {/* Typing indicator */}
              {ahmedTyping && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#FF9E64]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF9E64] animate-ping" />
                  <span>Ahmed is typing...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#787896]">
              <Monitor className="w-3.5 h-3.5" />
              <span>Remote Host Display · Mirroring · 60 FPS</span>
            </div>
          </div>

          {/* Mirrored Code Display */}
          <div className="flex-1 flex overflow-hidden font-mono text-xs relative opacity-95">
            {/* Line Numbers */}
            <div className="w-10 bg-[#09090f] py-4 pr-2 text-right text-[#45455c] select-none border-r border-[#171722] shrink-0 space-y-1">
              {remoteCode.split('\n').map((_, i) => (
                <div key={i} className={`h-5 text-[11px] ${i + 1 === 16 ? 'text-[#FF9E64] font-bold' : ''}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Read-Only Mirrored Screen */}
            <div className="flex-1 relative overflow-auto p-4 bg-[#09090f]">
              <pre className="text-[#d8d8e8] font-mono text-xs leading-5 select-text">
                <code>{remoteCode}</code>
              </pre>

              {/* Ahmed's Live Cursor Highlight */}
              <div className="absolute top-[310px] right-6 px-2 py-0.5 rounded bg-[#FF9E64] text-[#09090e] text-[10px] font-mono font-bold shadow-md pointer-events-none">
                Ahmed
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Collaboration Toolbar (Pixel-Perfect to Screenshot 2) */}
      <div className="h-12 bg-[#0c0c14] border-t border-[#1c1c2b] px-4 flex items-center justify-between shrink-0 font-mono text-xs z-30">
        
        {/* Left Controls: Mic, Camera, Release Control */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsRemoteMuted(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              isRemoteMuted ? 'bg-[#181824] border-[#252536] text-[#8e8ea6]' : 'bg-[#0DF5C4]/15 border-[#0DF5C4]/40 text-[#0DF5C4]'
            }`}
          >
            {isRemoteMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isRemoteMuted ? 'Mute' : 'Unmuted'}</span>
          </button>

          <button
            onClick={() => setIsRemoteCameraOn(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              isRemoteCameraOn ? 'bg-[#181824] border-[#252536] text-[#c4c4dc]' : 'bg-[#181824] border-[#252536] text-[#6b6b85]'
            }`}
          >
            {isRemoteCameraOn ? <Video className="w-3.5 h-3.5 text-[#0DF5C4]" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span>Camera On</span>
          </button>

          <button
            onClick={() => setIsRemoteControlling(prev => !prev)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-1.5 shadow transition-all hover:brightness-110"
            style={{ backgroundColor: theme.primary }}
          >
            <Lock className="w-3.5 h-3.5 text-[#09090e]" />
            <span>{isRemoteControlling ? 'Release Control' : 'Request Control'}</span>
          </button>

          <label className="hidden lg:flex items-center gap-1.5 text-xs text-[#8c8ca5] cursor-pointer ml-2">
            <input type="checkbox" defaultChecked className="rounded accent-[#6C63FF]" />
            <span>Follow Ahmed&apos;s Scroll</span>
          </label>
        </div>

        {/* Right Controls: Share Terminal, Chat, Stream Quality */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert('Terminal sharing enabled. Port 8080 forwarded.')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141420] hover:bg-[#1c1c2a] border border-[#232336] text-[#a4a4c6] hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Share Terminal</span>
          </button>

          <button 
            onClick={() => setPage('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141420] hover:bg-[#1c1c2a] border border-[#232336] text-white transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Chat</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#6C63FF] text-[10px] text-white font-bold">2</span>
          </button>

          <div className="hidden xl:flex items-center gap-3 text-[11px] text-[#71718c] pl-2 border-l border-[#1f1f2e]">
            <span>Stream: 4K (60fps)</span>
            <span className="text-[#0DF5C4]">📶 Loss: 0.0% · 18.4 Mbps</span>
          </div>
        </div>

      </div>

    </div>
  );
};
