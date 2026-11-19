import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CopyButton from "../components/CopyButton.jsx";
import { createSecret } from "../lib/api.js";
import { formatDateTime, formatRelative } from "../lib/format.js";

const MAX_SECRET_LENGTH = 10_000;

const EXPIRY_OPTIONS = [
  { label: "10 Minutes", minutes: 10 },
  { label: "1 Hour", minutes: 60 },
  { label: "24 Hours", minutes: 1_440 },
  { label: "7 Days", minutes: 10_080 },
];

function Feature({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-emerald-300">
        <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-slate-500">{children}</p>
      </div>
    </li>
  );
}

function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-4 py-3 text-[0.82rem] text-rose-200"
    >
      <Flame className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

export default function Home() {
  const [secretText, setSecretText] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!secretText.trim()) {
      setError("Paste a secret before generating a link.");
      return;
    }

    setLoading(true);
    try {
      const created = await createSecret({
        secretText,
        expiresInMinutes: expiryMinutes,
        passphrase: usePassphrase ? passphrase : null,
      });
      setResult({
        ...created,
        link: `${window.location.origin}/s/${created.secret_id}`,
        passphraseUsed: usePassphrase && Boolean(passphrase.trim()),
      });
      setSecretText("");
      setPassphrase("");
      setUsePassphrase(false);
    } catch (err) {
      setError(err.message || "Could not create the secret. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setResult(null);
    setError("");
    setSecretText("");
    setPassphrase("");
    setUsePassphrase(false);
    setShowPassphrase(false);
    setExpiryMinutes(60);
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
      <section className="animate-fade-up lg:sticky lg:top-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          Private by default
        </span>

        <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.4rem]">
          Share a secret.
          <br />
          <span className="text-gradient">Then it&apos;s gone.</span>
        </h1>

        <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-slate-400">
          Send passwords, API keys, or private notes through a link that works
          exactly once. Every secret is encrypted before it touches the database
          and permanently erased the moment it is read.
        </p>

        <ul className="mt-9 space-y-5">
          <Feature icon={Lock} title="Encrypted at rest">
            Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256). Plaintext is
            never written to the database.
          </Feature>
          <Feature icon={Flame} title="Burns on first reveal">
            The reveal and the delete happen in one transaction. There is no
            second read, no backup copy, no undo.
          </Feature>
          <Feature icon={Clock} title="Expires automatically">
            Choose a lifetime from ten minutes to seven days. Expired records are
            purged whenever the API is queried.
          </Feature>
        </ul>

        <div className="mt-10 hidden border-t border-white/[0.07] pt-6 lg:block">
          <div className="flex items-center gap-3 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-slate-600">
            <span className="text-emerald-400/80">01</span> Encrypt
            <ArrowRight className="h-3 w-3" />
            <span className="text-emerald-400/80">02</span> Share
            <ArrowRight className="h-3 w-3" />
            <span className="text-emerald-400/80">03</span> Burn
          </div>
        </div>
      </section>

      <section className="animate-fade-up [animation-delay:120ms]">
        {result ? (
          <div ref={resultRef} className="panel scroll-mt-24 overflow-hidden" role="status">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <span className="absolute inset-0 -z-10 rounded-2xl bg-emerald-400/25 blur-lg" />
                </span>
                <div>
                  <p className="mono-label">Secret encrypted</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Your one-time link is ready
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-[0.85rem] leading-relaxed text-slate-400">
                Send this link through a channel you trust. It opens a single
                time — after the recipient reveals the secret, the link is dead
                for everyone, including you.
              </p>

              <div className="mt-6">
                <p className="label">
                  <Link2 className="h-3.5 w-3.5" /> Shareable link
                </p>
                <div className="rounded-xl border border-white/10 bg-ink-950/80 px-4 py-3 font-mono text-[0.76rem] leading-relaxed text-emerald-200/90 break-all">
                  {result.link}
                </div>
                <CopyButton
                  text={result.link}
                  label="Copy one-time link"
                  copiedLabel="Link copied"
                  className="btn-primary mt-3 w-full py-3.5"
                  iconClassName="h-4 w-4"
                  onError={setError}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="mono-label">Expires</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[0.78rem] font-medium text-slate-200">
                    <Timer className="h-3.5 w-3.5 text-emerald-400/80" />
                    {formatRelative(result.expires_at)}
                  </p>
                  <p className="mt-1 text-[0.68rem] text-slate-500">
                    {formatDateTime(result.expires_at)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="mono-label">Protection</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[0.78rem] font-medium text-slate-200">
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400/80" />
                    {result.passphraseUsed ? "Passphrase" : "Link only"}
                  </p>
                  <p className="mt-1 text-[0.68rem] text-slate-500">
                    Single reveal
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5 text-[0.78rem] leading-relaxed text-amber-200/90">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  This is the only time the link is shown. Anyone who opens it
                  first will destroy the secret — even if they don&apos;t know the
                  passphrase.
                </span>
              </div>

              <ErrorAlert message={error} />

              <button type="button" onClick={resetForm} className="btn-ghost mt-5 w-full">
                Create another secret
              </button>
            </div>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5 sm:px-7">
              <div>
                <p className="mono-label">New secret</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-white">
                  Create a one-time link
                </h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
                <Lock className="h-[18px] w-[18px]" />
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-7">
              <div>
                <div className="flex items-end justify-between">
                  <label htmlFor="secret" className="label mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Secret content
                  </label>
                  <span className="mb-2 font-mono text-[0.65rem] text-slate-600">
                    {secretText.length.toLocaleString()}/{MAX_SECRET_LENGTH.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="secret"
                  value={secretText}
                  onChange={(event) => setSecretText(event.target.value)}
                  maxLength={MAX_SECRET_LENGTH}
                  rows={6}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={"Paste a password, API key, connection string,\nor a private note here…"}
                  className="field min-h-[158px] resize-y font-mono text-[0.8rem] leading-relaxed"
                />
                <p className="mt-2 text-[0.7rem] text-slate-600">
                  Encrypted server-side before storage — only ciphertext is persisted.
                </p>
              </div>

              <fieldset>
                <legend className="label">
                  <Clock className="h-3.5 w-3.5" /> Expires after
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EXPIRY_OPTIONS.map((option) => {
                    const active = expiryMinutes === option.minutes;
                    return (
                      <button
                        key={option.minutes}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setExpiryMinutes(option.minutes)}
                        className={`rounded-xl border px-2 py-2.5 text-[0.76rem] font-semibold transition ${
                          active
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]"
                            : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div
                className={`rounded-xl border transition ${
                  usePassphrase
                    ? "border-emerald-400/25 bg-emerald-400/[0.035]"
                    : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setUsePassphrase((value) => !value)}
                  aria-pressed={usePassphrase}
                  aria-controls="passphrase-field"
                  className="flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        usePassphrase
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-white/[0.04] text-slate-500"
                      }`}
                    >
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[0.82rem] font-semibold text-slate-200">
                        Add a passphrase
                      </span>
                      <span className="mt-0.5 block text-[0.7rem] text-slate-500">
                        Optional second factor for the recipient
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      usePassphrase ? "bg-emerald-400" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        usePassphrase ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>

                {usePassphrase && (
                  <div id="passphrase-field" className="animate-fade-in px-4 pb-4">
                    <div className="relative">
                      <input
                        type={showPassphrase ? "text" : "password"}
                        value={passphrase}
                        onChange={(event) => setPassphrase(event.target.value)}
                        maxLength={256}
                        autoComplete="new-password"
                        placeholder="Enter a passphrase for the recipient"
                        aria-label="Passphrase"
                        className="field pr-11"
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
                    <p className="mt-2 text-[0.68rem] leading-relaxed text-slate-500">
                      Share it separately from the link. Wrong attempts do not
                      destroy the secret.
                    </p>
                  </div>
                )}
              </div>

              <ErrorAlert message={error} />

              <button
                type="submit"
                disabled={loading || !secretText.trim()}
                className="btn-primary w-full py-3.5 text-[0.9rem]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Encrypting…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Generate One-Time Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-slate-600">
                <Flame className="h-3 w-3" />
                The link works only once. Existing secrets cannot be recovered.
              </p>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
