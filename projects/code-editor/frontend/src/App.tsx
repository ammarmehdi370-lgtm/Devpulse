import React from 'react';
import { Home, Search, UserRound, WandSparkles, Shapes, Tag, Trash2, PenLine } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <main className="style-board">
      <section className="palette-column" aria-label="Color palette">
        <PaletteCard name="Primary" value="#6C63FF" color="primary" />
        <PaletteCard name="Secondary" value="#00F5C4" color="secondary" />
        <PaletteCard name="Tertiary" value="#FF9E64" color="tertiary" />
        <PaletteCard name="Neutral" value="#111118" color="neutral" />
      </section>

      <section className="specimen-grid" aria-label="Interface specimens">
        <Specimen className="type-specimen"><SpecimenLabel name="Headline" font="Inter" /><div className="type-sample">Aa</div></Specimen>
        <Specimen className="button-specimen"><div className="button-row"><button className="sample-button primary-button">Primary</button><button className="sample-button secondary-button">Secondary</button></div><div className="button-row"><button className="sample-button inverted-button">Inverted</button><button className="sample-button outlined-button">Outlined</button></div></Specimen>
        <Specimen className="search-specimen"><div className="search-box"><Search size={15} /><span>Search</span></div></Specimen>
        <Specimen className="type-specimen"><SpecimenLabel name="Body" font="Inter" /><div className="type-sample">Aa</div></Specimen>
        <Specimen className="meter-specimen"><div className="meter meter-purple" /><div className="meter meter-mint" /><div className="meter meter-orange" /></Specimen>
        <Specimen className="nav-specimen"><nav className="nav-pill"><button className="nav-item active"><Home size={15} /></button><button className="nav-item"><Search size={15} /></button><button className="nav-item"><UserRound size={15} /></button></nav></Specimen>
        <Specimen className="type-specimen label-type"><SpecimenLabel name="Label" font="JetBrains Mono" /><div className="type-sample">Aa</div></Specimen>
        <Specimen className="action-specimen"><button className="square-action orange"><PenLine size={16} /></button></Specimen>
        <Specimen className="tag-specimen"><button className="tag-button"><PenLine size={13} />Label</button></Specimen>
        <Specimen className="icon-specimen"><button className="icon-tile purple"><WandSparkles size={14} /></button><button className="icon-tile mint"><Shapes size={14} /></button><button className="icon-tile orange"><Tag size={14} /></button><button className="icon-tile red"><Trash2 size={14} /></button></Specimen>
      </section>
    </main>
  );
};

const Specimen: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => <article className={`specimen ${className || ''}`}>{children}</article>;

const SpecimenLabel: React.FC<{ name: string; font: string }> = ({ name, font }) => <div className="specimen-label"><span>{name}</span><span>{font}</span></div>;

const PaletteCard: React.FC<{ name: string; value: string; color: string }> = ({ name, value, color }) => <article className={`palette-card ${color}`}><div className="palette-heading"><strong>{name}</strong><span>{value}</span></div><div className="swatch-strip" /></article>;

export default App;
