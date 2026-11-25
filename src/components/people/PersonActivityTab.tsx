import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { PersonActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActivityKindFilter = "all" | "email" | "meeting";

export function PersonActivityTab({ personId }: { personId: string }) {
  const { handleApiError } = useAuth();
  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>("all");

  const activityQuery = useQuery({
    queryKey: ["person-activity", personId, kindFilter],
    queryFn: async () => {
      let req = api
        .from("person_activity")
        .select(
          "person_id,kind,item_id,occurred_at,ends_at,title,snippet,direction,from_email,from_name,person_address,is_main_link,mailbox_email,thread_or_ical_id",
        )
        .eq("person_id", personId)
        .order("occurred_at", { ascending: false });

      if (kindFilter !== "all") {
        req = req.eq("kind", kindFilter);
      }

      const { data, error } = await req;
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as PersonActivity[];
    },
  });

  const items = activityQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex h-8 items-center rounded-md border border-border bg-surface-subtle p-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "email", label: "Emails" },
              { id: "meeting", label: "Meetings" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKindFilter(option.id)}
              className={cn(
                "h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                kindFilter === option.id
                  ? "bg-background text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {!activityQuery.isPending ? (
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>

      {activityQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-2 h-3.5 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-12 text-center">
          <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">No activity yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Synced emails and calendar meetings for this person will appear here.
          </p>
        </div>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item) => {
            const isEmail = item.kind === "email";
            const isMeeting = item.kind === "meeting";
            const sender = item.from_name
              ? item.from_email
                ? `${item.from_name} (${item.from_email})`
                : item.from_name
              : item.from_email ?? item.person_address;

            return (
              <li
                key={`${item.kind}-${item.item_id}`}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={isEmail ? "blue" : isMeeting ? "orange" : "grey"}>
                      {isEmail ? (
                        <Mail className="mr-1 h-3 w-3" />
                      ) : isMeeting ? (
                        <Calendar className="mr-1 h-3 w-3" />
                      ) : null}
                      {isEmail ? "Email" : isMeeting ? "Meeting" : item.kind}
                    </Badge>
                    {item.direction ? <Badge variant="grey">{item.direction}</Badge> : null}
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {item.title || "(No subject)"}
                    </h3>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(item.occurred_at)}
                  </time>
                </div>

                {sender ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {isEmail ? "From: " : "Organiser / participant: "}
                    <span className="text-foreground">{sender}</span>
                    {item.mailbox_email ? ` · Mailbox: ${item.mailbox_email}` : ""}
                  </p>
                ) : null}

                {item.snippet ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {item.snippet}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}