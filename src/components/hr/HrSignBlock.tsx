import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ArrowDown, Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

export function useScrolledToEnd({
  enabled,
  resetKey,
  containerRef,
}: {
  enabled: boolean;
  resetKey: string;
  containerRef?: RefObject<HTMLElement | null>;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setHasScrolledToEnd(true);
      return;
    }
    setHasScrolledToEnd(false);

    const check = () => {
      const sentinel = endRef.current;
      if (!sentinel) return;
      const sentinelRect = sentinel.getBoundingClientRect();
      const container = containerRef?.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.height > 0 && sentinelRect.top <= containerRect.bottom + 12) {
          setHasScrolledToEnd(true);
        }
      } else if (window.innerHeight > 0 && sentinelRect.top <= window.innerHeight + 12) {
        setHasScrolledToEnd(true);
      }
    };

    const rafId = window.requestAnimationFrame(check);
    const timerId = window.setTimeout(check, 250);
    const scrollTarget: EventTarget = containerRef?.current ?? window;
    scrollTarget.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && endRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) setHasScrolledToEnd(true);
        },
        { root: containerRef?.current ?? null, threshold: 0 },
      );
      observer.observe(endRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      scrollTarget.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      observer?.disconnect();
    };
  }, [containerRef, enabled, resetKey]);

  return { endRef, hasScrolledToEnd };
}

/**
 * In-app "acknowledge and sign" (backend crm_79): tick the agreement, type your full name, sign.
 * The server records the evidence (time, IP, browser, the email it was sent to, the document hash) and
 * builds the signed PDF; this component only collects { agreed: true, typed_name }.
 */
export function HrSignBlock({
  busy,
  onSign,
  hasScrolledToEnd = true,
}: {
  busy: boolean;
  onSign: (typedName: string) => void | Promise<void>;
  hasScrolledToEnd?: boolean;
}) {
  const id = useId();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const typed = name.trim().replace(/\s+/g, " ");
  const ready = hasScrolledToEnd && agreed && typed.length >= 2 && !busy;
  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-subtle p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-agree`}
          checked={agreed}
          onCheckedChange={(value) => setAgreed(value === true)}
          disabled={busy}
          className="mt-0.5"
        />
        <Label htmlFor={`${id}-agree`} className="text-sm font-medium leading-5">
          I have read and agree to this document
        </Label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-xs text-muted-foreground">
          Type your full name
        </Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          autoComplete="name"
          maxLength={200}
          disabled={busy}
        />
      </div>
      <div
        aria-label="Signature preview"
        className="rounded-md border border-dashed border-border bg-background px-4 py-3"
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Signature preview
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <span
            className={
              typed
                ? "font-serif text-2xl italic tracking-wide text-foreground"
                : "font-serif text-lg italic text-muted-foreground/60"
            }
          >
            {typed || "Your signature"}
          </span>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!ready} onClick={() => void onSign(typed)}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
          Acknowledge and sign
        </Button>
        {!hasScrolledToEnd ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowDown className="h-3.5 w-3.5" />
            Scroll to the end to continue
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Signing records your typed name, the date and time, and a fingerprint of this exact document. A signed PDF
        copy is emailed to you.
      </p>
    </div>
  );
}
