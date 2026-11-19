import { Flame, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="background-grid absolute inset-0" />
      <div className="absolute -top-48 left-1/2 h-[34rem] w-[58rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.09] blur-[120px]" />
      <div className="absolute -right-40 top-40 h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.06] blur-[110px]" />
      <div className="absolute inset-0 noise opacity-[0.03]" />
    </div>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400/60"
      aria-label="BurnLink home"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 transition group-hover:border-emerald-400/40 group-hover:bg-emerald-400/15">
        <Flame className="h-[18px] w-[18px]" strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-md -z-10" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-bold tracking-tight text-white">
          BurnLink
        </span>
        <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-slate-500">
          one-time secrets
        </span>
      </span>
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="chip hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            AES-128 · HMAC
          </span>
          <span className="chip">
            <Lock className="h-3 w-3 text-emerald-400/80" />
            No account needed
          </span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400/70" />
          Secrets are encrypted at rest and destroyed on first reveal.
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em]">
            FastAPI · React · SQLite
          </span>
          <a
            href="https://github.com/malik-faran/self-destructing-secret"
            target="_blank"
            rel="noreferrer noopener"
            className="text-slate-400 transition hover:text-white"
            aria-label="View source on GitHub"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-10 sm:px-8 lg:pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
