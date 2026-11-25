import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatMoney, formatText } from "@/lib/format";
import { api } from "@/lib/supabase";
import type { CompanyDeal } from "@/lib/types";

function dealStatusBadge(status: string): { label: string; variant: "blue" | "green" | "red" | "grey" } {
  switch (status) {
    case "won":
      return { label: "Won", variant: "green" };
    case "lost":
      return { label: "Lost", variant: "red" };
    case "in_progress":
      return { label: "In progress", variant: "blue" };
    default:
      return { label: status || "Unknown", variant: "grey" };
  }
}

export function CompanyDealsTab({ companyId }: { companyId: string }) {
  const { handleApiError } = useAuth();

  const dealsQuery = useQuery({
    queryKey: ["company-deals", companyId],
    queryFn: async () => {
      const { data, error } = await api
        .from("company_deals")
        .select(
          "id,name,status,company_id,company_name,primary_person_id,primary_person_name,owner_staff_id,owner_name,value,currency,value_gbp,closed_at,last_activity_at,created_at,updated_at",
        )
        .eq("company_id", companyId)
        .order("last_activity_at", { ascending: false, nullsFirst: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as CompanyDeal[];
    },
  });

  const rows = dealsQuery.data ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-border bg-surface-subtle">
          <tr className="h-9 text-xs font-medium text-muted-foreground">
            <th className="px-4 font-medium">Deal</th>
            <th className="px-4 font-medium">Status</th>
            <th className="px-4 font-medium">Value</th>
            <th className="hidden px-4 font-medium md:table-cell">Primary contact</th>
            <th className="hidden px-4 font-medium md:table-cell">Owner</th>
            <th className="px-4 text-right font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-row-divider">
          {dealsQuery.isPending ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <tr key={idx} className="h-[46px]">
                <td className="px-4"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4"><Skeleton className="h-4 w-24" /></td>
                <td className="hidden px-4 md:table-cell"><Skeleton className="h-4 w-28" /></td>
                <td className="hidden px-4 md:table-cell"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4"><Skeleton className="ml-auto h-4 w-28" /></td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center">
                <Handshake className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">No deals yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Deals associated with this company will appear here.
                </p>
              </td>
            </tr>
          ) : (
            rows.map((deal) => {
              const badge = dealStatusBadge(deal.status);
              return (
                <tr key={deal.id} className="h-[46px] hover:bg-accent/50">
                  <td className="px-4 font-medium text-foreground">{deal.name}</td>
                  <td className="px-4">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 text-foreground">
                    {formatMoney(deal.value, deal.currency, deal.value_gbp)}
                  </td>
                  <td className="hidden px-4 text-muted-foreground md:table-cell">
                    {formatText(deal.primary_person_name)}
                  </td>
                  <td className="hidden px-4 text-muted-foreground md:table-cell">
                    {formatText(deal.owner_name)}
                  </td>
                  <td className="whitespace-nowrap px-4 text-right text-xs text-muted-foreground">
                    {formatDateTime(deal.last_activity_at ?? deal.created_at)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}