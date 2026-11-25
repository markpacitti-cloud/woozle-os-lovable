import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CompanyActivityTab } from "@/components/companies/CompanyActivityTab";
import { CompanyDealsTab } from "@/components/companies/CompanyDealsTab";
import { CompanyEditSheet } from "@/components/companies/CompanyEditSheet";
import { CompanyHeader } from "@/components/companies/CompanyHeader";
import { CompanyOverviewTab } from "@/components/companies/CompanyOverviewTab";
import { CompanyPeopleTab } from "@/components/companies/CompanyPeopleTab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { api, getErrorMessage } from "@/lib/supabase";
import type { CompanyDetail } from "@/lib/types";

export const Route = createFileRoute("/companies/$companyId")({
  head: () => ({
    meta: [
      { title: "Company · Sales · Woozle OS" },
      { name: "description", content: "Company overview, people, deals, and activity in Woozle OS." },
      { property: "og:title", content: "Company · Sales · Woozle OS" },
      {
        property: "og:description",
        content: "Company overview, people, deals, and activity in Woozle OS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyDetailPage,
});

function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { access, handleApiError } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const canView = Boolean(!access || access.companies_view || access.is_global_admin);
  const canEdit = Boolean(access?.companies_edit || access?.is_global_admin);
  const canViewDeals = Boolean(access?.deals_view || access?.is_global_admin);

  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    enabled: canView && Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await api
        .from("company_detail")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return data as CompanyDetail;
    },
  });

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Company</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to view companies.
        </p>
      </div>
    );
  }

  if (companyQuery.isPending) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <div className="p-6">
        <Link
          to="/companies"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Companies
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Company unavailable
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {getErrorMessage(companyQuery.error, "This company could not be found.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void companyQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const company = companyQuery.data;

  return (
    <div className="flex min-h-full flex-col">
      <CompanyHeader company={company} canEdit={canEdit} onOpenEdit={() => setEditOpen(true)} />

      <div className="flex-1 px-5 py-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-9 bg-surface-subtle p-1">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="people" className="text-xs">
              People
            </TabsTrigger>
            {canViewDeals ? (
              <TabsTrigger value="deals" className="text-xs">
                Deals
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="activity" className="text-xs">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <CompanyOverviewTab company={company} />
          </TabsContent>
          <TabsContent value="people" className="mt-4">
            <CompanyPeopleTab companyId={company.id} />
          </TabsContent>
          {canViewDeals ? (
            <TabsContent value="deals" className="mt-4">
              <CompanyDealsTab companyId={company.id} />
            </TabsContent>
          ) : null}
          <TabsContent value="activity" className="mt-4">
            <CompanyActivityTab companyId={company.id} />
          </TabsContent>
        </Tabs>
      </div>

      <CompanyEditSheet company={company} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}