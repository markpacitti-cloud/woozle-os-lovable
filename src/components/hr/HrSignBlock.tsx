import { useId, useState } from "react";
import { Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * In-app "acknowledge and sign" (backend crm_79): tick the agreement, type your full name, sign.
 * The server records the evidence (time, IP, browser, the email it was sent to, the document hash) and
 * builds the signed PDF; this component only collects { agreed: true, typed_name }.
 */
export function HrSignBlock({
  busy,
  onSign,
}: {
  busy: boolean;
  onSign: (typedName: string) => void | Promise<void>;
}) {
  const id = useId();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const typed = name.trim().replace(/\s+/g, " ");
  const ready = agreed && typed.length >= 2 && !busy;

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
          Type your full name to sign
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
      <Button size="lg" disabled={!ready} onClick={() => void onSign(typed)}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
        Acknowledge and sign
      </Button>
      <p className="text-xs text-muted-foreground">
        Signing records your typed name, the date and time, and a fingerprint of this exact document. A signed PDF
        copy is emailed to you.
      </p>
    </div>
  );
}
