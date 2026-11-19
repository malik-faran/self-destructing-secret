import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  ServerOff,
  ShieldCheck,
  Timer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CopyButton from "../components/CopyButton.jsx";
import { getSecretMeta, revealSecret } from "../lib/api.js";
import { formatDateTime, formatRelative } from "../lib/format.js";

function Shell({ children }) {
  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-up">{children}</div>
  );
}

function LoadingState() {
  return (
    <Shell>
      <div className="panel px-6 py-14 text-center sm:px-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
        </span>
        <p className="mono-label mt-6">Verifying link</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Checking this secret…
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[0.85rem] leading-relaxed text-slate-500">
          We&apos;re only confirming that the link is active. Nothing has been
          decrypted or consumed yet.
        </p>
        <div className="mx-auto mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full w-1/2 animate-pulse-soft rounded-full bg-emerald-400/60" />
        </div>
      </div>
    </Shell>
  );
}

function BurnedState() {
  return (
    <Shell>
      <div className="panel relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/20 blur-[70px]"
        />
        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10">
          <Flame className="h-7 w-7 text-rose-400" />
        </span>
        <p className="mono-label mt-7 text-rose-300/70">Link burned</p>
        <h1 className="mx-auto mt-2 max-w-md text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
          This secret has self-destructed or expired
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[0.86rem] leading-relaxed text-slate-400">
          The link was already opened, the secret reached its expiry time, or it
          never existed. One-time links cannot be reopened, and no copy remains
          on the server.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary w-full sm:w-auto">
            <Lock className="h-4 w-4" />
            Create a new secret
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-ghost w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Check again
          </button>
        </div>
        <p className="mt-7 text-[0.7rem] text-slate-600">
          If the link was working a moment ago, it was most likely opened once
          already.
        </p>
      </div>
      <p className="mt-5 text-center text-xs text-slate-600">
        <Link to="/" className="transition hover:text-slate-300">
          <ArrowLeft className="mr-1 inline h-3 w-3" />
          Back to BurnLink
        </Link>
      </p>
    </Shell>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Shell>
      <div className="panel px-6 py-12 text-center sm:px-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <ServerOff className="h-6 w-6 text-amber-300" />
        </span>
        <p className="mono-label mt-6">Connection problem</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          We couldn&apos;t check this link
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[0.85rem] leading-relaxed text-slate-400">
          {message ||
            "The API did not respond. Verify that the backend is running, then try again."}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onRetry} className="btn-primary w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link to="/" className="btn-ghost w-full sm:w-auto">
            Create a secret
          </Link>
        </div>
        <p className="mt-6 font-mono text-[0.65rem] text-slate-600">
          The secret was not consumed by this error.
        </p>
      </div>
    </Shell>
  );
}

function RevealedState({ secretText, copyError, onCopyError }) {
  return (
    <Shell>
      <div className="panel relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <span className="absolute inset-0 -z-10 rounded-2xl bg-emerald-400/25 blur-lg" />
            </span>
            <div>
              <p className="mono-label text-emerald-400/80">Revealed &amp; destroyed</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white">
                Secret revealed — and wiped
              </h1>
            </div>
          </div>

          <p className="mt-5 text-[0.85rem] leading-relaxed text-slate-400">
            This is the only time this secret will ever be shown. Copy it or
            store it somewhere safe now.
          </p>

          <div className="mt-5">
            <p className="label">
              <ShieldCheck className="h-3.5 w-3.5" /> Decrypted secret
            </p>
            <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-emerald-400/20 bg-ink-950/90 p-4 font-mono text-[0.8rem] leading-relaxed text-emerald-100">{secretText}</pre>
            <CopyButton
              text={secretText}
              label="Copy secret"
              copiedLabel="Secret copied"
              className="btn-primary mt-3 w-full py-3.5"
              iconClassName="h-4 w-4"
              onError={onCopyError}
            />
          </div>

          {copyError && (
            <p role="alert" className="mt-3 text-center text-xs text-rose-300">
              {copyError}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3.5">
            <Trash2 className="h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-[0.78rem] leading-relaxed text-emerald-100/80">
              <span className="font-semibold text-emerald-200">Wiped from the server.</span>{" "}
              A second reveal now returns <span className="font-mono">404</span>.
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5 text-[0.78rem] leading-relaxed text-amber-200/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Closing this page without saving the secret means it&apos;s gone
              for good. We cannot recover it for you.
            </span>
          </div>

          <Link to="/" className="btn-ghost mt-5 w-full">
            <Flame className="h-4 w-4" />
            Create your own one-time link
          </Link>
        </div>
      </div>
    </Shell>
  );
}

export default function Reveal() {
  const { secretId } = useParams();
  const [phase, setPhase] = useState("loading");
  const [meta, setMeta] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealedText, setRevealedText] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [copyError, setCopyError] = useState("");

  const loadMeta = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    setError("");
    setMeta(null);
    try {
      const data = await getSecretMeta(secretId);
      setMeta(data);
      setPhase("ready");
    } catch (err) {
      if (err.status === 404) {
        setPhase("burned");
      } else {
        setLoadError(err.message);
        setPhase("error");
      }
    }
  }, [secretId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (phase !== "loading") window.scrollTo({ top: 0 });
  }, [phase]);

  async function handleReveal(event) {
    event.preventDefault();
    if (meta?.requires_passphrase && !passphrase) {
      setError("Enter the passphrase to unlock this secret.");
      return;
    }

    setRevealing(true);
    setError("");
    setCopyError("");
    try {
      const data = await revealSecret(secretId, passphrase);
      setRevealedText(data.secret_text);
      setPassphrase("");
      setPhase("revealed");
    } catch (err) {
      if (err.status === 404) {
        setPhase("burned");
      } else {
        setError(err.message || "The secret could not be revealed.");
      }
    } finally {
      setRevealing(false);
    }
  }

  if (phase === "loading") return <LoadingState />;
  if (phase === "burned") return <BurnedState />;
  if (phase === "error") {
    return <ErrorState message={loadError} onRetry={loadMeta} />;
  }
  if (phase === "revealed") {
    return (
      <RevealedState
        secretText={revealedText}
        copyError={copyError}
        onCopyError={setCopyError}
      />
    );
  }

  const secondsLeft = meta?.expires_at
    ? (new Date(meta.expires_at).getTime() - Date.now()) / 1000
    : null;
  const expiringSoon = secondsLeft !== null && secondsLeft < 600;

  return (
    <Shell>
      <div className="panel overflow-hidden">
        <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-transparent px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="chip border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300">
              <Lock className="h-3 w-3" />
              Encrypted link
            </span>
            <span
              className={`chip ${
                expiringSoon
                  ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-300"
                  : ""
              }`}
            >
              <Clock className="h-3 w-3" />
              Expires {formatRelative(meta.expires_at)}
            </span>
          </div>

          <h1 className="mt-5 text-[1.7rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
            A secret is waiting for you
          </h1>
          <p className="mt-3 max-w-lg text-[0.86rem] leading-relaxed text-slate-400">
            Read it once, then save it somewhere safe. As soon as it is revealed,
            the encrypted record is deleted from the server forever.
          </p>
        </div>

        <form onSubmit={handleReveal} className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-[0.8rem] leading-relaxed text-amber-100/90">
              <span className="font-semibold text-amber-200">Heads up:</span> this
              secret can only be viewed once and will be permanently erased
              immediately after you reveal it. Don&apos;t close this tab until
              you&apos;ve saved it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <p className="mono-label">
                <Timer className="mr-1 inline h-3 w-3" /> Expires
              </p>
              <p className="mt-1.5 text-[0.78rem] font-medium text-slate-200">
                {formatDateTime(meta.expires_at)}
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                {formatRelative(meta.expires_at)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <p className="mono-label">
                <KeyRound className="mr-1 inline h-3 w-3" /> Protection
              </p>
              <p className="mt-1.5 text-[0.78rem] font-medium text-slate-200">
                {meta.requires_passphrase ? "Passphrase required" : "Link only"}
              </p>
              <p className="mt-1 text-[0.68rem] text-slate-500">
                Single reveal
              </p>
            </div>
          </div>

          {meta.requires_passphrase && (
            <div className="animate-fade-in">
              <label htmlFor="passphrase" className="label">
                <KeyRound className="h-3.5 w-3.5" /> Passphrase
              </label>
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? "text" : "password"}
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  autoComplete="off"
                  maxLength={256}
                  placeholder="Ask the sender for the passphrase"
                  className="field pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-slate-200"
                  aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPassphrase ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[0.68rem] text-slate-500">
                A wrong passphrase will not destroy the secret — you can try
                again.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-[0.8rem] leading-relaxed text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={revealing || (meta.requires_passphrase && !passphrase)}
            className="btn-danger w-full py-4 text-[0.9rem]"
          >
            {revealing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Decrypting &amp; destroying…
              </>
            ) : (
              <>
                <Flame className="h-4 w-4" />
                Reveal &amp; Destroy Secret
              </>
            )}
          </button>

          <p className="flex items-start justify-center gap-1.5 text-center text-[0.68rem] leading-relaxed text-slate-600">
            <ShieldCheck className="mt-px h-3 w-3 shrink-0" />
            Nothing is decrypted until you press the button. This page only
            checked that the link is active.
          </p>
        </form>
      </div>
    </Shell>
  );
}
