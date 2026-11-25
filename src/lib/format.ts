const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  valueGbp?: number | null,
): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const code = (currency ?? "GBP").trim().toUpperCase() || "GBP";
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
    }).format(Number(value));
  } catch {
    formatted = `${code} ${Number(value).toLocaleString("en-GB")}`;
  }
  if (code !== "GBP" && valueGbp !== null && valueGbp !== undefined && !Number.isNaN(Number(valueGbp))) {
    const gbp = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(Number(valueGbp));
    return `${formatted} (${gbp})`;
  }
  return formatted;
}

export function formatText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const str = String(value).trim();
  return str.length > 0 ? str : "—";
}

export function toExternalHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseOAuthErrorFromUrl(search: string, hash: string): string | null {
  const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashString = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashString);
  const desc = searchParams.get("error_description") ?? hashParams.get("error_description");
  if (desc && desc.trim()) return desc.replace(/\+/g, " ").trim();
  const err = searchParams.get("error") ?? hashParams.get("error");
  if (err && err.trim() && !searchParams.has("connected")) return err.replace(/\+/g, " ").trim();
  return null;
}

export interface GmailBanner {
  kind: "success" | "error";
  message: string;
}

export function parseGmailBannerFromUrl(search: string): GmailBanner | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const connected = params.get("connected");
  if (connected === "1") {
    const email = params.get("email");
    return {
      kind: "success",
      message: email ? `Connected Gmail (${email}).` : "Connected Gmail.",
    };
  }
  if (connected === "0") {
    const code = params.get("error") ?? "";
    if (code === "mailbox_mismatch") {
      return { kind: "error", message: "That wasn't your Woozle mailbox" };
    }
    if (code === "mailbox_already_connected") {
      return { kind: "error", message: "Ask an admin" };
    }
    if (code === "invalid_state") {
      return { kind: "error", message: "Press Connect Gmail again" };
    }
    return { kind: "error", message: code || "Could not connect Gmail" };
  }
  return null;
}