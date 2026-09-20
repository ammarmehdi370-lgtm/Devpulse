'use client';

import React, { useState } from 'react';
import { useApp, ThemeConfig } from '../context/AppContext';
import { 
  Check, 
  ArrowRight, 
  Search, 
  Home, 
  User, 
  Sparkles, 
  GitBranch, 
  Tag, 
  Trash2, 
  Edit3, 
  Sliders, 
  CheckCircle,
  Eye
} from 'lucide-react';

// Generates 10 tonal ramp shades from a base hex color
function generateTonalRamp(hex: string): string[] {
  // Return tailored shades representing light to dark
  return [
    '#050508',
    '#0d0d16',
    '#1a192c',
    '#2c2a50',
    '#433e7d',
    hex,
    '#8781ff',
    '#aba6ff',
    '#cecbff',
    '#ffffff'
  ];
}

export const ThemePalettePage: React.FC = () => {
  const { theme, setTheme, availableThemes, setPage } = useApp();
  const [selectedThemeId, setSelectedThemeId] = useState(theme.id);
  const [customPrimary, setCustomPrimary] = useState(theme.primary);
  const [customSecondary, setCustomSecondary] = useState(theme.secondary);
  const [customTertiary, setCustomTertiary] = useState(theme.tertiary);
  const [previewSearchText, setPreviewSearchText] = useState('');

  const handleSelectPreset = (t: ThemeConfig) => {
    setSelectedThemeId(t.id);
    setCustomPrimary(t.primary);
    setCustomSecondary(t.secondary);
    setCustomTertiary(t.tertiary);
    setTheme(t);
  };

  const handleApplyAndContinue = () => {
    // Navigate to repositories page as requested by user
    setPage('repositories');
  };

  // 10-shade tonal swatches
  const primaryRamp = [
    '#0b0a1a', '#141235', '#241f60', '#3b339a', '#5449d8', 
    customPrimary, 
    '#8880ff', '#aaa4ff', '#ccc8ff', '#ffffff'
  ];

  const secondaryRamp = [
    '#001a14', '#003328', '#005c48', '#008a6d', '#00bd95', 
    customSecondary, 
    '#4df7d3', '#80f9e1', '#b3fcef', '#ffffff'
  ];

  const tertiaryRamp = [
    '#1a0f08', '#331e10', '#5c361c', '#8a512b', '#bd6f3a', 
    customTertiary, 
    '#ffb283', '#ffc5a2', '#ffd9c2', '#ffffff'
  ];

  const neutralRamp = [
    '#000000', '#0a0a0f', '#111118', '#1c1c24', '#282834', 
    '#3e3e4f', '#5c5c72', '#84849e', '#b8b8cc', '#ffffff'
  ];

  return (
    <div className="min-h-screen w-full bg-[#08080c] text-white p-4 sm:p-8 flex flex-col items-center justify-center relative font-sans">
      {/* Background glow */}
      <div 
        className="absolute top-10 left-1/3 w-[600px] h-[300px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-700" 
        style={{ backgroundColor: customPrimary }}
      />

      <div className="w-full max-w-[1240px] z-10 space-y-6">
        
        {/* Top Control Bar */}
        <div className="bg-[#101017] border border-[#20202e] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Sliders className="w-5 h-5" style={{ color: customPrimary }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Design System & Theme Palette</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border" style={{ backgroundColor: `${customPrimary}15`, borderColor: `${customPrimary}40`, color: customPrimary }}>
                  LIVE TOKENS
                </span>
              </div>
              <p className="text-xs text-[#7e7e98]">Step 2 of 5: Select or customize your system theme before provisioning repositories.</p>
            </div>
          </div>

          {/* Theme Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectPreset(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                  selectedThemeId === t.id
                    ? 'bg-white/10 text-white border-white/30 shadow-sm'
                    : 'bg-[#151520] text-[#8e8ea6] border-[#252535] hover:border-white/20'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.primary }} />
                <span>{t.name}</span>
                {selectedThemeId === t.id && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={handleApplyAndContinue}
              className="ml-2 px-5 py-2 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-2 shadow-lg transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: customPrimary, color: '#0e0e14' }}
            >
              <span>Continue to Repositories</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 3-Column Token Grid (Pixel-Perfect to Screenshot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Column 1: Color Tokens with 10-Shade Tonal Ramps */}
          <div className="md:col-span-4 space-y-4">
            
            {/* Primary Swatch Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl overflow-hidden p-4 shadow-lg">
              <div 
                className="h-28 rounded-xl p-3 flex flex-col justify-between mb-3 text-white font-mono shadow-inner transition-colors duration-300"
                style={{ backgroundColor: customPrimary }}
              >
                <div className="flex justify-between items-center text-xs font-medium text-white/90">
                  <span>Primary</span>
                  <label className="bg-black/25 px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1.5 cursor-pointer hover:bg-black/40">
                    <input 
                      type="color" 
                      value={customPrimary} 
                      onChange={(e) => {
                        setCustomPrimary(e.target.value);
                        setTheme({ ...theme, primary: e.target.value });
                      }}
                      className="w-3.5 h-3.5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span>{customPrimary.toUpperCase()}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-10 h-7 rounded-lg overflow-hidden border border-black/30">
                {primaryRamp.map((c, i) => (
                  <div key={i} className="h-full" style={{ backgroundColor: c }} title={`Shade ${i * 10}%`} />
                ))}
              </div>
            </div>

            {/* Secondary Swatch Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl overflow-hidden p-4 shadow-lg">
              <div 
                className="h-28 rounded-xl p-3 flex flex-col justify-between mb-3 text-white font-mono shadow-inner transition-colors duration-300"
                style={{ backgroundColor: customSecondary }}
              >
                <div className="flex justify-between items-center text-xs font-medium text-black/80">
                  <span className="font-semibold">Secondary</span>
                  <label className="bg-black/15 px-2 py-0.5 rounded backdrop-blur-sm text-black font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-black/25">
                    <input 
                      type="color" 
                      value={customSecondary} 
                      onChange={(e) => {
                        setCustomSecondary(e.target.value);
                        setTheme({ ...theme, secondary: e.target.value });
                      }}
                      className="w-3.5 h-3.5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span>{customSecondary.toUpperCase()}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-10 h-7 rounded-lg overflow-hidden border border-black/30">
                {secondaryRamp.map((c, i) => (
                  <div key={i} className="h-full" style={{ backgroundColor: c }} title={`Shade ${i * 10}%`} />
                ))}
              </div>
            </div>

            {/* Tertiary Swatch Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl overflow-hidden p-4 shadow-lg">
              <div 
                className="h-28 rounded-xl p-3 flex flex-col justify-between mb-3 text-white font-mono shadow-inner transition-colors duration-300"
                style={{ backgroundColor: customTertiary }}
              >
                <div className="flex justify-between items-center text-xs font-medium text-black/80">
                  <span className="font-semibold">Tertiary</span>
                  <label className="bg-black/15 px-2 py-0.5 rounded backdrop-blur-sm text-black font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-black/25">
                    <input 
                      type="color" 
                      value={customTertiary} 
                      onChange={(e) => {
                        setCustomTertiary(e.target.value);
                        setTheme({ ...theme, tertiary: e.target.value });
                      }}
                      className="w-3.5 h-3.5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span>{customTertiary.toUpperCase()}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-10 h-7 rounded-lg overflow-hidden border border-black/30">
                {tertiaryRamp.map((c, i) => (
                  <div key={i} className="h-full" style={{ backgroundColor: c }} title={`Shade ${i * 10}%`} />
                ))}
              </div>
            </div>

            {/* Neutral Swatch Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl overflow-hidden p-4 shadow-lg">
              <div className="h-28 rounded-xl p-3 bg-[#111118] border border-[#222230] flex flex-col justify-between mb-3 text-white font-mono">
                <div className="flex justify-between items-center text-xs font-medium text-[#a0a0ba]">
                  <span>Neutral</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded">#111118</span>
                </div>
              </div>
              <div className="grid grid-cols-10 h-7 rounded-lg overflow-hidden border border-black/40">
                {neutralRamp.map((c, i) => (
                  <div key={i} className="h-full" style={{ backgroundColor: c }} title={`Neutral ${i * 10}%`} />
                ))}
              </div>
            </div>

          </div>

          {/* Column 2: Typography Token Cards (Aa Previews) */}
          <div className="md:col-span-4 space-y-4">
            
            {/* Headline Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-6 h-[178px] flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center text-xs font-mono text-[#8a8aa8]">
                <span>Headline</span>
                <span className="text-white">Inter</span>
              </div>
              <div className="text-center">
                <span className="text-6xl sm:text-7xl font-bold tracking-tight text-[#d5d5e8] group-hover:text-white transition-colors">
                  Aa
                </span>
              </div>
              <div className="text-[11px] text-[#6b6b85] font-mono text-center">SemiBold · 28px - 48px</div>
            </div>

            {/* Body Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-6 h-[178px] flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center text-xs font-mono text-[#8a8aa8]">
                <span>Body</span>
                <span className="text-white">Inter</span>
              </div>
              <div className="text-center">
                <span className="text-6xl sm:text-7xl font-normal tracking-normal text-[#b8b8d0] group-hover:text-white transition-colors">
                  Aa
                </span>
              </div>
              <div className="text-[11px] text-[#6b6b85] font-mono text-center">Regular · 14px - 16px</div>
            </div>

            {/* Label Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-6 h-[178px] flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center text-xs font-mono text-[#8a8aa8]">
                <span>Label</span>
                <span className="text-white">JetBrains Mono</span>
              </div>
              <div className="text-center">
                <span className="text-6xl sm:text-7xl font-mono text-[#a0a0ba] group-hover:text-white transition-colors">
                  Aa
                </span>
              </div>
              <div className="text-[11px] text-[#6b6b85] font-mono text-center">Medium · 12px - 13px</div>
            </div>

          </div>

          {/* Column 3: Interactive UI Elements & Component Tokens */}
          <div className="md:col-span-4 space-y-4">
            
            {/* Component Buttons Card */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Primary Button */}
                <button 
                  className="py-2.5 px-3 rounded-lg text-xs font-semibold shadow transition-transform active:scale-95 text-[#0d0d14]"
                  style={{ backgroundColor: customPrimary }}
                >
                  Primary
                </button>
                {/* Secondary Button */}
                <button 
                  className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-[#1a1a26] hover:bg-[#222234] border border-[#2e2e42] text-[#d5d5e8] transition-colors"
                >
                  Secondary
                </button>
                {/* Inverted Button */}
                <button 
                  className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90 transition-colors"
                >
                  Inverted
                </button>
                {/* Outlined Button */}
                <button 
                  className="py-2.5 px-3 rounded-lg text-xs font-medium border border-[#3e3e56] text-[#b8b8d0] hover:border-white/40 transition-colors"
                >
                  Outlined
                </button>
              </div>

              {/* Search Box Preview */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6c6c86] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search"
                  value={previewSearchText}
                  onChange={(e) => setPreviewSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#171722] border border-[#272738] rounded-xl text-xs text-white placeholder-[#5c5c76] focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>

            {/* Metrics Bars & Navigation Pill */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-5 shadow-lg space-y-5">
              {/* Progress bars (Primary, Secondary, Tertiary) */}
              <div className="space-y-3">
                <div className="w-full bg-[#1b1b28] h-2.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full w-[65%]" style={{ backgroundColor: customPrimary }} />
                </div>
                <div className="w-full bg-[#1b1b28] h-2.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full w-[85%]" style={{ backgroundColor: customSecondary }} />
                </div>
                <div className="w-full bg-[#1b1b28] h-2.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full w-[45%]" style={{ backgroundColor: customTertiary }} />
                </div>
              </div>

              {/* Navigation Bar Pill */}
              <div className="bg-[#171724] border border-[#262638] rounded-2xl p-2 flex items-center justify-around max-w-[240px] mx-auto shadow-md">
                <button 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: customPrimary }}
                >
                  <Home className="w-4 h-4 text-[#0e0e16]" />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7e7e9a] hover:text-white">
                  <Search className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7e7e9a] hover:text-white">
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Badges & Buttons */}
            <div className="bg-[#12121a] border border-[#20202e] rounded-2xl p-5 shadow-lg flex items-center justify-between gap-3">
              {/* Square Action in Tertiary */}
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: customTertiary }}
              >
                <Edit3 className="w-5 h-5 text-[#111118]" />
              </div>

              {/* Label Pill in Primary */}
              <div 
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium"
                style={{ backgroundColor: `${customPrimary}25`, color: customPrimary, border: `1px solid ${customPrimary}50` }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Label</span>
              </div>

              {/* Action Badges Palette */}
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#b5afff]/20 text-[#b5afff] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#0DF5C4]/20 text-[#0DF5C4] flex items-center justify-center">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FF9E64]/20 text-[#FF9E64] flex items-center justify-center">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#f87171]/20 text-[#f87171] flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
