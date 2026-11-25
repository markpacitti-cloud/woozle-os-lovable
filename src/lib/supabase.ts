import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cwbtercykiisngbecime.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iGBpIphqyIvyTw24JNjHMw_yC5MqSE-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Every data call goes through the `api` schema. Never use supabase.from(...) directly.
export const api = supabase.schema("api");

export function isSessionExpiredError(error: { code?: string | null; status?: number } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST301" || error.code === "PGRST303" || error.status === 401;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  if (typeof error === "string" && error.trim().length > 0) return error;
  return fallback;
}

export async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const ctx = (error as { context?: unknown }).context;
    if (ctx && typeof ctx === "object" && "json" in ctx && typeof (ctx as Response).json === "function") {
      try {
        const payload = (await (ctx as Response).clone().json()) as {
          error?: string;
          message?: string;
        };
        if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
        if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
      } catch {
        // Fall back to default error message when response body is not JSON.
      }
    }
  }
  return getErrorMessage(error, "Assistant request failed");
}