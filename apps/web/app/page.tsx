import { Activity, ArrowRight, Code2, MessagesSquare, Radio } from 'lucide-react';
import { Button } from '@devpulse/ui';

const features = [
  { icon: Code2, label: 'Code', text: 'A focused workspace for the code that moves your product forward.' },
  { icon: MessagesSquare, label: 'Collaborate', text: 'Keep team conversation close to the files and decisions that matter.' },
  { icon: Radio, label: 'Pulse', text: 'See your team, services, and AI work moving in real time.' }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-devpulse-bg text-devpulse-text">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight"><Activity className="text-devpulse-cyan" size={20} /> devpulse</div>
        <Button variant="ghost" size="sm">Sign in</Button>
      </nav>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24">
        <p className="mb-5 font-mono text-sm uppercase tracking-[0.24em] text-devpulse-cyan">The developer operating system</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">Your team&apos;s work, in one living workspace.</h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-devpulse-muted">Write code, get AI help, communicate with teammates, and feel the pulse of your team without switching apps.</p>
        <div className="mt-9 flex items-center gap-4"><Button size="lg">Open workspace <ArrowRight className="ml-2" size={18} /></Button><span className="text-sm text-devpulse-muted">Free for small teams</span></div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {features.map(({ icon: Icon, label, text }) => <article key={label} className="border border-white/10 bg-devpulse-panel p-6"><Icon className="mb-8 text-devpulse-purple" size={22} /><h2 className="text-xl font-medium">{label}</h2><p className="mt-3 leading-7 text-devpulse-muted">{text}</p></article>)}
      </section>
    </main>
  );
}
