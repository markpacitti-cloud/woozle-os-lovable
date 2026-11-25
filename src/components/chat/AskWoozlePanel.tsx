import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import {
  Archive,
  ArrowUp,
  Building2,
  History,
  Loader2,
  Plus,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PendingActionCard } from "@/components/chat/PendingActionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import type { SpaceId } from "@/lib/navigation";
import { extractEdgeFunctionError, supabase } from "@/lib/supabase";
import type {
  AiChatMessage,
  AiChatResponse,
  AiConversationSummary,
  AiLink,
  AiPendingAction,
} from "@/lib/types";

interface AskWoozlePanelProps {
  space: SpaceId;
  companyId?: string | undefined;
  companyName?: string | undefined;
  personId?: string | undefined;
  personName?: string | undefined;
  onClose: () => void;
}

export function AskWoozlePanel({
  space,
  companyId,
  companyName,
  personId,
  personName,
  onClose,
}: AskWoozlePanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<AiPendingAction[]>([]);
  const [links, setLinks] = useState<AiLink[]>([]);
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingActions, sending]);

  const navigateInternalPath = useCallback(
    (rawPath: string) => {
      const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
      const companyMatch = /^\/companies\/([^/]+)$/.exec(path);
      if (companyMatch && companyMatch[1]) {
        void navigate({ to: "/companies/$companyId", params: { companyId: companyMatch[1] } });
        return;
      }
      if (path === "/companies") {
        void navigate({ to: "/companies" });
        return;
      }
      const personMatch = /^\/people\/([^/]+)$/.exec(path);
      if (personMatch && personMatch[1]) {
        void navigate({ to: "/people/$personId", params: { personId: personMatch[1] } });
        return;
      }
      if (path === "/people") {
        void navigate({ to: "/people" });
        return;
      }
      const marketingMatch = /^\/marketing\/([^/]+)$/.exec(path);
      if (marketingMatch && marketingMatch[1]) {
        void navigate({ to: "/marketing/$section", params: { section: marketingMatch[1] } });
        return;
      }
      const adminMatch = /^\/admin\/([^/]+)$/.exec(path);
      if (adminMatch && adminMatch[1]) {
        void navigate({ to: "/admin/$section", params: { section: adminMatch[1] } });
        return;
      }
      const topMatch = /^\/([^/]+)$/.exec(path);
      if (topMatch && topMatch[1]) {
        void navigate({ to: "/$section", params: { section: topMatch[1] } });
        return;
      }
      void navigate({ to: "/companies" });
    },
    [navigate],
  );

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke<{
      conversations?: AiConversationSummary[];
    }>("ai-chat", {
      body: { action: "list" },
    });
    if (error) {
      toast.error(await extractEdgeFunctionError(error));
      return;
    }
    setConversations(data?.conversations ?? []);
  }, []);

  const openConversation = async (id: string) => {
    setLoadingHistory(true);
    const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", {
      body: { action: "history", conversation_id: id },
    });
    setLoadingHistory(false);
    if (error) {
      toast.error(await extractEdgeFunctionError(error));
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    setConversationId(data?.conversation_id ?? id);
    setMessages(data?.messages ?? []);
    setPendingActions(data?.pending_actions ?? []);
    setLinks(data?.links ?? []);
  };

  const archiveCurrentConversation = async () => {
    if (!conversationId) return;
    const { error } = await supabase.functions.invoke("ai-chat", {
      body: { action: "archive", conversation_id: conversationId },
    });
    if (error) {
      toast.error(await extractEdgeFunctionError(error));
      return;
    }
    toast.success("Conversation archived");
    setConversationId(null);
    setMessages([]);
    setPendingActions([]);
    setLinks([]);
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setPendingActions([]);
    setLinks([]);
    setInput("");
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const optimisticUser: AiChatMessage = {
      role: "user",
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSending(true);

    const chatSpace = space === "marketing" ? "marketing" : "sales";
    const body: Record<string, unknown> = {
      action: "message",
      conversation_id: conversationId,
      text: trimmed,
      space: chatSpace,
    };
    if (companyId) {
      body["context"] = { page: "company", record_id: companyId };
    } else if (personId) {
      body["context"] = { page: "person", record_id: personId };
    }

    const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", { body });
    setSending(false);

    if (error) {
      toast.error(await extractEdgeFunctionError(error));
      return;
    }
    if (data?.error) {
      toast.error(data.error);
    }
    if (data) {
      if (data.conversation_id) setConversationId(data.conversation_id);
      if (data.messages?.length) {
        setMessages((prev) => [...prev, ...data.messages]);
      }
      setPendingActions(data.pending_actions ?? []);
      setLinks(data.links ?? []);
    }
  };

  const handleDecideAction = async (actionId: string, decision: "approve" | "reject") => {
    setDecidingId(actionId);
    const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", {
      body: { action: decision, pending_action_id: actionId },
    });
    setDecidingId(null);

    if (error) {
      toast.error(await extractEdgeFunctionError(error));
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    if (data) {
      if (data.messages?.length) {
        setMessages((prev) => [...prev, ...data.messages]);
      }
      setPendingActions(data.pending_actions ?? []);
      setLinks(data.links ?? []);
    }
    if (decision === "approve") {
      toast.success("Change approved");
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["people"] });
      if (companyId) {
        await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
        await queryClient.invalidateQueries({ queryKey: ["company-people", companyId] });
      }
      if (personId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["person", personId] }),
          queryClient.invalidateQueries({ queryKey: ["person-emails", personId] }),
          queryClient.invalidateQueries({ queryKey: ["person-roles", personId] }),
          queryClient.invalidateQueries({ queryKey: ["person-deals", personId] }),
          queryClient.invalidateQueries({ queryKey: ["person-activity", personId] }),
        ]);
      }
    } else {
      toast.success("Change rejected");
    }
  };

  return (
    <aside className="flex h-full w-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-link" />
          <span className="text-sm font-semibold text-foreground">Ask Woozle</span>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu onOpenChange={(open) => open && void loadConversations()}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Chat history">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Recent chats
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conversations.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No previous chats
                </div>
              ) : (
                conversations.slice(0, 10).map((conv) => (
                  <DropdownMenuItem
                    key={conv.id}
                    onClick={() => void openConversation(conv.id)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="w-full truncate text-xs font-medium text-foreground">
                      {conv.title || "Untitled chat"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(conv.last_message_at ?? conv.created_at)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {conversationId ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Archive conversation"
              onClick={() => void archiveCurrentConversation()}
            >
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="New chat"
            onClick={startNewChat}
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close Ask Woozle"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {companyId ? (
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-subtle px-3 py-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-link" />
          <span className="truncate">Context: {companyName || "Current company"}</span>
        </div>
      ) : personId ? (
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-subtle px-3 py-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0 text-link" />
          <span className="truncate">Context: {personName || "Current person"}</span>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {loadingHistory ? (
          <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-subtle p-3.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Ask Woozle anything about your CRM</p>
            <p className="mt-1">
              {companyId
                ? "Questions will include this company automatically. Any suggested edits require your approval."
                : personId
                  ? "Questions will include this person automatically. Any suggested edits require your approval."
                  : "Search companies, people, review deals, or draft updates. Nothing changes until you approve."}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={`${msg.created_at}-${idx}`}
              className={
                msg.role === "user"
                  ? "ml-6 rounded-lg bg-accent px-3 py-2 text-xs text-foreground"
                  : "rounded-lg border border-border bg-background px-3 py-2.5"
              }
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="woozle-markdown">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          ))
        )}

        {links.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {links.map((link) => (
              <button
                key={`${link.type}-${link.id}`}
                type="button"
                onClick={() => navigateInternalPath(link.path)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-subtle px-2 py-1 text-xs text-link hover:bg-accent"
              >
                <span>{link.label}</span>
                <Badge variant="grey" className="px-1 py-0 text-[10px]">
                  {link.type}
                </Badge>
              </button>
            ))}
          </div>
        ) : null}

        {pendingActions.map((action) => (
          <PendingActionCard
            key={action.id}
            action={action}
            busy={decidingId === action.id}
            onDecide={(id, decision) => void handleDecideAction(id, decision)}
            onNavigatePath={navigateInternalPath}
          />
        ))}

        {sending ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-link" />
            <span>Woozle is thinking…</span>
          </div>
        ) : null}
      </div>

      <form
        className="shrink-0 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <div className="relative">
          <Textarea
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              companyId
                ? "Ask about this company…"
                : personId
                  ? "Ask about this person…"
                  : "Ask Woozle…"
            }
            rows={2}
            className="min-h-[64px] resize-none bg-surface-subtle pr-10 text-xs"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            className="absolute right-2 bottom-2 h-7 w-7"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </aside>
  );
}