import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PersonActivityTab } from "@/components/people/PersonActivityTab";
import { PersonDealsTab } from "@/components/people/PersonDealsTab";
import { PersonEditSheet } from "@/components/people/PersonEditSheet";
import { PersonEmailsTab } from "@/components/people/PersonEmailsTab";
import { PersonHeader } from "@/components/people/PersonHeader";
import { PersonOverviewTab } from "@/components/people/PersonOverviewTab";
import { PersonRolesTab } from "@/components/people/PersonRolesTab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { api, getErrorMessage } from "@/lib/supabase";
import type { PersonEmail, PersonListItem } from "@/lib/types";

export const Route = createFileRoute("/people/$personId")({
  head: () => ({
    meta: [
      { title: "Person · Sales · Woozle OS" },
      {
        name: "description",
        content: "Person overview, employment history, emails, deals, and activity in Woozle OS.",
      },
      { property: "og:title", content: "Person · Sales · Woozle OS" },
      {
        property: "og:description",
        content: "Person overview, employment history, emails, deals, and activity in Woozle OS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersonDetailPage,
});

function PersonDetailPage() {
  const { personId } = Route.useParams();
  const { access, handleApiError } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => {
    setIsArchived(false);
    setEditOpen(false);
  }, [personId]);

  const canView = Boolean(!access || access.people_view || access.is_global_admin);
  const canEdit = Boolean(access?.people_edit || access?.is_global_admin);
  const canViewDeals = Boolean(access?.deals_view || access?.is_global_admin);

  const personQuery = useQuery({
    queryKey: ["person", personId],
    enabled: canView && Boolean(personId),
    queryFn: async () => {
      const { data, error } = await api
        .from("people_list")
        .select(
          "id,full_name,first_name,last_name,linkedin_url,primary_company_id,primary_company_name,primary_title,primary_email_id,primary_email,primary_email_status,phone,source,created_at,updated_at,last_activity_at",
        )
        .eq("id", personId)
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? null) as PersonListItem | null;
    },
  });

  const emailsQuery = useQuery({
    queryKey: ["person-emails", personId],
    enabled: canView && Boolean(personId),
    queryFn: async () => {
      const { data, error } = await api
        .from("person_emails")
        .select(
          "id,person_id,email,email_domain,type,status,is_primary,verified_at,source,created_at,updated_at",
        )
        .eq("person_id", personId)
        .order("is_primary", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as PersonEmail[];
    },
  });

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Person</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to view people.
        </p>
      </div>
    );
  }

  if (personQuery.isPending) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (personQuery.isError || !personQuery.data) {
    return (
      <div className="p-6">
        <Link
          to="/people"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          People
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          Person unavailable
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {personQuery.isError
            ? getErrorMessage(personQuery.error, "This person could not be loaded.")
            : "This person could not be found or has been archived."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void personQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const person = personQuery.data;
  const emails = emailsQuery.data ?? [];
  const effectiveCanEdit = canEdit && !isArchived;

  return (
    <div className="flex min-h-full flex-col">
      <PersonHeader
        person={person}
        emails={emails}
        canEdit={canEdit}
        isArchived={isArchived}
        onArchivedChange={setIsArchived}
        onOpenEdit={() => setEditOpen(true)}
      />

      <div className="flex-1 px-5 py-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-9 flex-wrap bg-surface-subtle p-1">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="roles" className="text-xs">
              Roles
            </TabsTrigger>
            <TabsTrigger value="emails" className="text-xs">
              Emails
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
            <PersonOverviewTab person={person} />
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <PersonRolesTab personId={person.id} canEdit={effectiveCanEdit} />
          </TabsContent>
          <TabsContent value="emails" className="mt-4">
            <PersonEmailsTab
              personId={person.id}
              emails={emails}
              isPending={emailsQuery.isPending}
              canEdit={effectiveCanEdit}
            />
          </TabsContent>
          {canViewDeals ? (
            <TabsContent value="deals" className="mt-4">
              <PersonDealsTab personId={person.id} />
            </TabsContent>
          ) : null}
          <TabsContent value="activity" className="mt-4">
            <PersonActivityTab personId={person.id} />
          </TabsContent>
        </Tabs>
      </div>

      <PersonEditSheet
        person={person}
        emails={emails}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}