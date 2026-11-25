import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import { api, getErrorMessage, isSessionExpiredError, supabase } from "@/lib/supabase";
import {
  parseGmailBannerFromUrl,
  parseOAuthErrorFromUrl,
  type GmailBanner,
} from "@/lib/format";
import type { ConnectionStatus, MyAccess, StaffProfile } from "@/lib/types";

export type AuthGateState =
  | "loading"
  | "signed_out"
  | "no_access"
  | "access_blocked"
  | "first_run_gmail"
  | "ready";

interface AuthContextValue {
  state: AuthGateState;
  session: Session | null;
  profile: StaffProfile | null;
  access: MyAccess | null;
  connectionStatus: ConnectionStatus | null;
  oauthError: string | null;
  gmailBanner: GmailBanner | null;
  dismissGmailBanner: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  handleApiError: (error: unknown) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [state, setState] = useState<AuthGateState>("loading");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [gmailBanner, setGmailBanner] = useState<GmailBanner | null>(null);

  const loadStaffContext = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setProfile(null);
      setAccess(null);
      setConnectionStatus(null);
      setState("signed_out");
      return;
    }

    setState("loading");

    const profileRes = await api
      .from("my_staff_profile")
      .select("id,full_name,work_email,is_active,roles,permissions")
      .maybeSingle();

    if (profileRes.error) {
      if (isSessionExpiredError(profileRes.error)) {
        await supabase.auth.signOut();
        setState("signed_out");
        return;
      }
      toast.error(profileRes.error.message);
      setProfile(null);
      setAccess(null);
      setConnectionStatus(null);
      setState("no_access");
      return;
    }

    if (!profileRes.data) {
      setProfile(null);
      setAccess(null);
      setConnectionStatus(null);
      setState("no_access");
      return;
    }

    const staffProfile = profileRes.data as StaffProfile;
    setProfile(staffProfile);

    const [accessRes, connRes] = await Promise.all([
      api.from("my_access").select("*").maybeSingle(),
      api.from("my_connection_status").select("*").maybeSingle(),
    ]);

    if (accessRes.error) {
      toast.error(accessRes.error.message);
    }
    if (connRes.error) {
      toast.error(connRes.error.message);
    }

    const myAccess = (accessRes.data as MyAccess | null) ?? null;
    const conn = (connRes.data as ConnectionStatus | null) ?? null;
    setAccess(myAccess);
    setConnectionStatus(conn);

    if (conn && conn.access && conn.access !== "ok") {
      setState("access_blocked");
      return;
    }

    if (conn && conn.show_first_run) {
      setState("first_run_gmail");
      return;
    }

    setState("ready");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlErr = parseOAuthErrorFromUrl(window.location.search, window.location.hash);
    if (urlErr) setOauthError(urlErr);

    const banner = parseGmailBannerFromUrl(window.location.search);
    if (banner) {
      setGmailBanner(banner);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("connected");
      cleanUrl.searchParams.delete("email");
      cleanUrl.searchParams.delete("error");
      window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search);
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        toast.error(error.message);
        setState("signed_out");
        return;
      }
      setSession(data.session);
      void loadStaffContext(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        return;
      }
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
      void loadStaffContext(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadStaffContext, queryClient]);

  const signInWithGoogle = useCallback(async () => {
    setOauthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: "woozleresearch.com", prompt: "select_account" },
      },
    });
    if (error) {
      setOauthError(error.message);
      toast.error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    }
    setSession(null);
    setProfile(null);
    setAccess(null);
    setConnectionStatus(null);
    setState("signed_out");
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    await loadStaffContext(session);
  }, [loadStaffContext, session]);

  const handleApiError = useCallback(
    (error: unknown) => {
      const msg = getErrorMessage(error);
      toast.error(msg);
      if (isSessionExpiredError(error as { code?: string; status?: number })) {
        void signOut();
      }
    },
    [signOut],
  );

  const dismissGmailBanner = useCallback(() => setGmailBanner(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      profile,
      access,
      connectionStatus,
      oauthError,
      gmailBanner,
      dismissGmailBanner,
      signInWithGoogle,
      signOut,
      refreshProfile,
      handleApiError,
    }),
    [
      state,
      session,
      profile,
      access,
      connectionStatus,
      oauthError,
      gmailBanner,
      dismissGmailBanner,
      signInWithGoogle,
      signOut,
      refreshProfile,
      handleApiError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}