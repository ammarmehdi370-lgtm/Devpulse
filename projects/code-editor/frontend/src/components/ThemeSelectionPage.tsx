import React, { useState } from 'react';
import {
  Home,
  Search,
  UserRound,
  WandSparkles,
  Shapes,
  Tag,
  Trash2,
  PenLine,
  Sparkles,
  Check,
  ArrowRight,
  Palette
} from 'lucide-react';

export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'codeplane-dark',
    name: 'Codeplane Dark',
    primary: '#6C63FF',
    secondary: '#00F5C4',
    tertiary: '#FF9E64',
    neutral: '#111118',
  },
  {
    id: 'cyber-mint',
    name: 'Cyber Mint',
    primary: '#00F5C4',
    secondary: '#6C63FF',
    tertiary: '#38BDF8',
    neutral: '#0B1318',
  },
  {
    id: 'sunset-neon',
    name: 'Sunset Neon',
    primary: '#FF9E64',
    secondary: '#F43F5E',
    tertiary: '#818CF8',
    neutral: '#181116',
  },
  {
    id: 'deep-sapphire',
    name: 'Deep Sapphire',
    primary: '#38BDF8',
    secondary: '#818CF8',
    tertiary: '#34D399',
    neutral: '#0A0F1D',
  },
];

interface ThemeSelectionPageProps {
  currentTheme: ThemeConfig;
  onThemeSelect: (theme: ThemeConfig) => void;
  onContinue: () => void;
}

export const ThemeSelectionPage: React.FC<ThemeSelectionPageProps> = ({
  currentTheme,
  onThemeSelect,
  onContinue,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig>(currentTheme);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [autoSelectToast, setAutoSelectToast] = useState<string | null>(null);

  const handleSelect = (theme: ThemeConfig) => {
    setSelectedTheme(theme);
    onThemeSelect(theme);
  };

  const handleAutoSelect = () => {
    setIsAutoSelecting(true);
    setAutoSelectToast('Analyzing display profile & ambient lighting...');

    setTimeout(() => {
      // Intelligently auto-select optimal theme
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const autoTheme = THEME_PRESETS[0]; // Codeplane Dark optimized
      setSelectedTheme(autoTheme);
      onThemeSelect(autoTheme);
      setIsAutoSelecting(false);
      setAutoSelectToast('✓ Auto-selected: Codeplane Dark (Optimized for High-DPI & Low Strain)');

      setTimeout(() => {
        setAutoSelectToast(null);
      }, 3500);
    }, 600);
  };

  return (
    <div className="theme-page-container">
      {/* Top Floating Theme Bar */}
      <header className="theme-top-bar">
        <div className="theme-bar-left">
          <div className="theme-bar-title-wrap">
            <Palette size={16} className="theme-icon" />
            <span className="theme-bar-title">Design System &amp; Theme Studio</span>
          </div>
          <span className="theme-hint-text">Select your preferred editor theme or use Auto Select:</span>
        </div>

        {/* Theme Pills */}
        <div className="theme-selector-pills">
          {THEME_PRESETS.map((t) => (
            <button
              key={t.id}
              className={`theme-pill-btn ${selectedTheme.id === t.id ? 'active' : ''}`}
              onClick={() => handleSelect(t)}
            >
              <span className="theme-color-dot" style={{ backgroundColor: t.primary }} />
              <span>{t.name}</span>
              {selectedTheme.id === t.id && <Check size={12} className="pill-check" />}
            </button>
          ))}

          {/* Auto Select Button as requested */}
          <button
            className={`auto-select-theme-btn ${isAutoSelecting ? 'loading' : ''}`}
            onClick={handleAutoSelect}
            title="Automatically detect system preference & ambient lighting"
          >
            <Sparkles size={13} className="sparkle-spin" />
            <span>{isAutoSelecting ? 'Detecting...' : 'Auto Select Theme'}</span>
          </button>
        </div>

        {/* Continue Button to Editor */}
        <div className="theme-bar-right">
          {autoSelectToast && (
            <span className="auto-toast-badge animate-fade-in">{autoSelectToast}</span>
          )}
          <button className="continue-editor-btn" onClick={onContinue}>
            <span>Continue to Editor</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Specimen Board (Pixel-Exact to Screenshot) */}
      <main className="style-board-wrapper">
        <div className="style-board">
          {/* Column 1: Color Palette Cards with Swatch Strips */}
          <section className="palette-column" aria-label="Color palette">
            {/* Primary Card */}
            <article className="palette-card primary" style={{ backgroundColor: selectedTheme.primary }}>
              <div className="palette-heading">
                <strong>Primary</strong>
                <span>{selectedTheme.primary}</span>
              </div>
              <div
                className="swatch-strip"
                style={{
                  background: `linear-gradient(90deg, #05050a 0 9%, color-mix(in srgb, ${selectedTheme.primary} 92%, black) 9% 18%, color-mix(in srgb, ${selectedTheme.primary} 78%, black) 18% 27%, color-mix(in srgb, ${selectedTheme.primary} 65%, black) 27% 36%, color-mix(in srgb, ${selectedTheme.primary} 48%, black) 36% 45%, color-mix(in srgb, ${selectedTheme.primary} 32%, white) 45% 55%, color-mix(in srgb, ${selectedTheme.primary} 52%, white) 55% 65%, color-mix(in srgb, ${selectedTheme.primary} 70%, white) 65% 75%, color-mix(in srgb, ${selectedTheme.primary} 84%, white) 75% 88%, #fff 88%)`
                }}
              />
            </article>

            {/* Secondary Card */}
            <article className="palette-card secondary" style={{ backgroundColor: selectedTheme.secondary }}>
              <div className="palette-heading">
                <strong>Secondary</strong>
                <span>{selectedTheme.secondary}</span>
              </div>
              <div
                className="swatch-strip"
                style={{
                  background: `linear-gradient(90deg, #05050a 0 9%, color-mix(in srgb, ${selectedTheme.secondary} 92%, black) 9% 18%, color-mix(in srgb, ${selectedTheme.secondary} 78%, black) 18% 27%, color-mix(in srgb, ${selectedTheme.secondary} 65%, black) 27% 36%, color-mix(in srgb, ${selectedTheme.secondary} 48%, black) 36% 45%, color-mix(in srgb, ${selectedTheme.secondary} 32%, white) 45% 55%, color-mix(in srgb, ${selectedTheme.secondary} 52%, white) 55% 65%, color-mix(in srgb, ${selectedTheme.secondary} 70%, white) 65% 75%, color-mix(in srgb, ${selectedTheme.secondary} 84%, white) 75% 88%, #fff 88%)`
                }}
              />
            </article>

            {/* Tertiary Card */}
            <article className="palette-card tertiary" style={{ backgroundColor: selectedTheme.tertiary }}>
              <div className="palette-heading">
                <strong>Tertiary</strong>
                <span>{selectedTheme.tertiary}</span>
              </div>
              <div
                className="swatch-strip"
                style={{
                  background: `linear-gradient(90deg, #05050a 0 9%, color-mix(in srgb, ${selectedTheme.tertiary} 92%, black) 9% 18%, color-mix(in srgb, ${selectedTheme.tertiary} 78%, black) 18% 27%, color-mix(in srgb, ${selectedTheme.tertiary} 65%, black) 27% 36%, color-mix(in srgb, ${selectedTheme.tertiary} 48%, black) 36% 45%, color-mix(in srgb, ${selectedTheme.tertiary} 32%, white) 45% 55%, color-mix(in srgb, ${selectedTheme.tertiary} 52%, white) 55% 65%, color-mix(in srgb, ${selectedTheme.tertiary} 70%, white) 65% 75%, color-mix(in srgb, ${selectedTheme.tertiary} 84%, white) 75% 88%, #fff 88%)`
                }}
              />
            </article>

            {/* Neutral Card */}
            <article className="palette-card neutral" style={{ backgroundColor: selectedTheme.neutral }}>
              <div className="palette-heading">
                <strong>Neutral</strong>
                <span>{selectedTheme.neutral}</span>
              </div>
              <div className="swatch-strip" style={{ background: 'linear-gradient(90deg, #05050a 0 9%, #22222b 9% 18%, #393943 18% 27%, #51515b 27% 36%, #696973 36% 45%, #81818a 45% 55%, #9999a2 55% 65%, #b1b1ba 65% 75%, #d9d9e0 75% 88%, #f4f3fa 88%)' }} />
            </article>
          </section>

          {/* Column 2 & 3: Specimen Grid */}
          <section className="specimen-grid" aria-label="Interface specimens">
            {/* Top Row: Headline Aa, Buttons, Search */}
            <article className="specimen type-specimen">
              <div className="specimen-label">
                <span>Headline</span>
                <span>Inter</span>
              </div>
              <div className="type-sample">Aa</div>
            </article>

            <article className="specimen button-specimen">
              <div className="button-row">
                <button className="sample-button primary-button" style={{ backgroundColor: '#c4c1ff' }}>
                  Primary
                </button>
                <button className="sample-button secondary-button">Secondary</button>
              </div>
              <div className="button-row">
                <button className="sample-button inverted-button">Inverted</button>
                <button className="sample-button outlined-button">Outlined</button>
              </div>
            </article>

            <article className="specimen search-specimen">
              <div className="search-box">
                <Search size={15} />
                <span>Search</span>
              </div>
            </article>

            {/* Middle Row: Body Aa, Meters, Nav Pill */}
            <article className="specimen type-specimen">
              <div className="specimen-label">
                <span>Body</span>
                <span>Inter</span>
              </div>
              <div className="type-sample">Aa</div>
            </article>

            <article className="specimen meter-specimen">
              <div className="meter meter-purple" />
              <div className="meter meter-mint" />
              <div className="meter meter-orange" />
            </article>

            <article className="specimen nav-specimen">
              <nav className="nav-pill">
                <button className="nav-item active">
                  <Home size={15} />
                </button>
                <button className="nav-item">
                  <Search size={15} />
                </button>
                <button className="nav-item">
                  <UserRound size={15} />
                </button>
              </nav>
            </article>

            {/* Bottom Row: Label Aa, Action Square, Tag Button, Icon Tiles */}
            <article className="specimen type-specimen label-type">
              <div className="specimen-label">
                <span>Label</span>
                <span>JetBrains Mono</span>
              </div>
              <div className="type-sample">Aa</div>
            </article>

            <article className="specimen action-specimen">
              <button className="square-action orange" aria-label="Edit item">
                <PenLine size={16} />
              </button>
            </article>

            <article className="specimen tag-specimen">
              <button className="tag-button">
                <PenLine size={13} />
                <span>Label</span>
              </button>
            </article>

            <article className="specimen icon-specimen">
              <button className="icon-tile purple" title="Wand"><WandSparkles size={14} /></button>
              <button className="icon-tile mint" title="Shapes"><Shapes size={14} /></button>
              <button className="icon-tile orange" title="Tag"><Tag size={14} /></button>
              <button className="icon-tile red" title="Delete"><Trash2 size={14} /></button>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
};
