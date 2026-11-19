import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl animate-fade-up">
      <div className="panel px-6 py-14 text-center sm:px-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <Compass className="h-6 w-6 text-slate-400" />
        </span>
        <p className="mono-label mt-6">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          This page doesn&apos;t exist
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[0.85rem] leading-relaxed text-slate-400">
          The address may be mistyped, or the link you followed has already been
          used.
        </p>
        <Link to="/" className="btn-primary mt-7">
          <ArrowLeft className="h-4 w-4" />
          Back to BurnLink
        </Link>
      </div>
    </div>
  );
}
