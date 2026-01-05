import Link from 'next/link';
import { ArrowRight, Zap, Brain, Terminal, Sparkles, Database, MessageSquare, Heart, Check } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Dynamic Personality',
    description: '14 evolving traits, 11 moods, and per-user relationship tracking that creates genuine connections.',
    href: '/ai/personality',
  },
  {
    icon: Database,
    title: 'Semantic Memory',
    description: 'User-specific memories and server-wide awareness using vector embeddings for true context recall.',
    href: '/ai/memory',
  },
  {
    icon: Terminal,
    title: 'Jarvis Mode',
    description: 'Natural language admin commands with LLM-powered intent parsing. "Give Kevin 100 bebits" just works.',
    href: '/jarvis',
  },
  {
    icon: Zap,
    title: 'Engagement System',
    description: 'Daily check-ins, Bebits currency, streak tracking, and an 11-tier reward shop.',
    href: '/features',
  },
];

const differentiators = [
  {
    title: 'Remembers You',
    description: 'Beboa learns facts about each user and recalls them naturally in conversation.',
  },
  {
    title: 'Aware of Everything',
    description: 'Server-wide memory means she notices conversations happening across all channels.',
  },
  {
    title: 'Grows with Interaction',
    description: 'Personality traits and relationships evolve based on how you interact with her.',
  },
  {
    title: 'True Character',
    description: 'Not just an AI wrapper—Beboa has consistent lore, preferences, and a defined personality.',
  },
];

const quickStart = [
  { step: 'Clone Repository', command: 'git clone https://github.com/CMLKevin/beboa_evo.git' },
  { step: 'Install Dependencies', command: 'cd beboa_evo && npm install' },
  { step: 'Configure Environment', command: 'cp .env.example .env' },
  { step: 'Start the Bot', command: 'npm start' },
];

export default function HomePage() {
  return (
    <div className="animate-in">
      {/* Hero */}
      <div className="mb-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <span className="text-6xl">🐍</span>
            <span className="absolute -bottom-1 -right-1 text-2xl">✨</span>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
              Beboa
            </h1>
            <p className="text-xl text-[var(--text-secondary)]">
              A Discord bot with personality
            </p>
          </div>
        </div>

        <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-10">
          Beboa is an AI-powered Discord companion that remembers your conversations, evolves her
          personality through interactions, and manages your community with natural language commands.
          Bratty, snarky, and secretly caring.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/getting-started/quickstart"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-all hover:shadow-soft hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/CMLKevin/beboa_evo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">Core Features</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:shadow-soft transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[var(--accent-light)]">
                  <feature.icon className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2 flex items-center gap-2">
                    {feature.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">Quick Start</h2>
        <div className="relative pl-8">
          {/* Connecting line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[var(--accent)] via-[var(--border)] to-[var(--border)]" />

          <div className="space-y-6">
            {quickStart.map((item, index) => (
              <div key={item.step} className="relative">
                {/* Step indicator */}
                <div className="absolute -left-8 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--accent)] text-xs font-semibold text-[var(--accent)]">
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-base font-medium text-[var(--text-primary)] mb-2">
                    {item.step}
                  </h4>
                  <code className="block text-sm text-[var(--code-text)] bg-[var(--code-bg)] px-4 py-3 rounded-lg font-mono">
                    {item.command}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Link
            href="/getting-started/quickstart"
            className="text-sm text-[var(--accent)] font-medium hover:underline inline-flex items-center gap-1"
          >
            View full installation guide
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* What Makes Beboa Different */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
          What makes Beboa different?
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-2xl">
          Unlike simple chat bots, Beboa is designed as a persistent presence with genuine character development.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {differentiators.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
            >
              <div className="flex-shrink-0 mt-0.5">
                <Check className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h4 className="font-medium text-[var(--text-primary)] mb-1">{item.title}</h4>
                <p className="text-sm text-[var(--text-muted)]">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Explore the Docs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Installation', href: '/getting-started/installation', icon: Terminal },
            { title: 'Configuration', href: '/getting-started/configuration', icon: Sparkles },
            { title: 'AI Systems', href: '/ai', icon: Brain },
            { title: 'Commands', href: '/commands/user', icon: MessageSquare },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col items-center text-center p-5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:shadow-soft transition-all"
            >
              <div className="p-2.5 rounded-lg bg-[var(--accent-light)] mb-3 group-hover:scale-110 transition-transform">
                <link.icon className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {link.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Character Note */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[var(--accent-light)] to-[var(--bg-tertiary)] border border-[var(--border)]">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🐍</span>
          <div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--text-primary)]">Fun fact:</span> Beboa is technically a cat in a snake costume who
              <em className="text-[var(--accent)]"> absolutely insists</em> she&apos;s a real snake. Don&apos;t bring it up—she gets defensive.
              She&apos;s the guardian of the HeartB Crystal and takes her job very seriously (when she&apos;s not being bratty about it).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
