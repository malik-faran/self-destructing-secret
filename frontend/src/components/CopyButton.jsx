import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard.js";

export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "btn-ghost",
  iconClassName = "h-4 w-4",
  onError,
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    const success = await copyText(text);
    if (!success) {
      onError?.("Copy failed — select the text and copy it manually.");
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? (
        <Check className={`${iconClassName} text-emerald-400`} />
      ) : (
        <Copy className={iconClassName} />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
