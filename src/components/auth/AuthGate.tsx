import { useState, type ReactNode } from "react";
import { AlertCircle, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { api, extractEdgeFunctionError, supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const { state, connectionStatus, oauthError, signInWithGoogle, signOut, refreshProfile } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-3 h-4 w-52" />
          <Skeleton className="mt-6 h-9 w-full" />
        </div>
      </div>
    );
  }

  if (state === "signed_out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
              W
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Woozle OS</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your Woozle Research Google account to continue.
          </p>

          {oauthError ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-tag-red px-3 py-2.5 text-xs text-tag-red-foreground"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{oauthError}</span>
            </div>
          ) : null}

          <Button
            className="mt-6 w-full"
            disabled={signingIn}
            onClick={async () => {
              setSigningIn(true);
              await signInWithGoogle();
              setSigningIn(false);
            }}
          >
            {signingIn ? "Redirecting to Google…" : "Sign in with Google"}
          </Button>
        </div>
      </main>
    );
  }

  if (state === "no_access") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            You don&apos;t have access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have an active Woozle staff profile.
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  if (state === "access_blocked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            You don&apos;t have access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {connectionStatus?.access_message ?? "Access is restricted for this account."}
          </p>
          <Button variant="outline" className="mt-6 w-full" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  if (state === "first_run_gmail") {
    const handleConnectGmail = async () => {
      setGmailBusy(true);
      const { data, error } = await supabase.functions.invoke<{ url?: string }>("nylas-auth", {
        method: "GET",
      });
      if (error || !data?.url) {
        toast.error(await extractEdgeFunctionError(error));
        setGmailBusy(false);
        return;
      }
      window.location.assign(data.url);
    };

    const handleSkip = async () => {
      setGmailBusy(true);
      const { error } = await api.rpc("skip_mailbox_setup");
      if (error) {
        toast.error(error.message);
        setGmailBusy(false);
        return;
      }
      await refreshProfile();
      setGmailBusy(false);
    };

    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-link" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Connect your Gmail
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Woozle mailbox to sync emails and calendar meetings into company timelines.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={gmailBusy} onClick={() => void handleConnectGmail()}>
              Connect Gmail
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={gmailBusy}
              onClick={() => void handleSkip()}
            >
              Skip for now
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}