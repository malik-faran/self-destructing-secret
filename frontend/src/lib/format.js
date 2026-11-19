export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelative(isoString) {
  if (!isoString) return "";
  const target = new Date(isoString).getTime();
  if (Number.isNaN(target)) return "";
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  if (diffSeconds <= 0) return "expired";

  const units = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, seconds] of units) {
    if (diffSeconds >= seconds || unit === "second") {
      const value = Math.round(diffSeconds / seconds);
      return `in ${value} ${unit}${value === 1 ? "" : "s"}`;
    }
  }
  return "";
}
