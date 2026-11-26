import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, Pencil, Plus, Send } from "lucide-react";

import { HrEmploymentEditor, HrEmploymentPay } from "@/components/hr/HrEmploymentPay";
import { HrNotesPanel } from "@/components/hr/HrNotesPanel";
import { HrRequestsTable } from "@/components/hr/HrRequestsTable";
import { HrSendDocumentDialog } from "@/components/hr/HrSendDocumentDialog";
import {
  HrDetail,
  HrEmpty,
  HrError,
  HrLoading,
  HrPage,
  HrPermissionMessage,
  HrSection,
  HrStatusBadge,
} from "@/components/hr/HrShared";
import { HrStartCaseDialog } from "@/components/hr/HrStartCaseDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/format";
import type { HrCase, HrPersonListItem, HrRequest, HrTeamMember } from "@/lib/hr-types";
import { api, getErrorMessage } from "@/lib/supabase";

export function HrStaffRecord({ staffId, mode }: { staffId: string; mode: "team" | "admin" }) {
  const navigate = useNavigate();
  const { access, handleApiError } = useAuth();
  const canView =
    mode === "admin"
      ? Boolean(access?.hr_admin_view || access?.is_global_admin)
      : Boolean(access?.hr_team || access?.is_global_admin);
  const canEdit = mode === "admin" && Boolean(access?.hr_admin_edit || access?.is_global_admin);
  const [sendOpen, setSendOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [employmentOpen, setEmploymentOpen] = useState(false);

  const personQuery = useQuery({
    queryKey: ["hr-staff", mode, staffId],
    enabled: canView,
    queryFn: async () => {
      const view = mode === "admin" ? "hr_people_list" : "hr_my_team";
      const { data, error } = await api
        .from(view)
        .select("*")
        .eq("staff_id", staffId)
        .maybeSingle();
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? null) as HrTeamMember | HrPersonListItem | null;
    },
  });
  const requestsQuery = useQuery({
    queryKey: ["hr-requests", staffId],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_requests_list")
        .select("*")
        .eq("staff_id", staffId)
        .order("sent_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrRequest[];
    },
  });
  const casesQuery = useQuery({
    queryKey: ["hr-cases", "staff", staffId],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await api
        .from("hr_cases_list")
        .select("*")
        .eq("staff_id", staffId)
        .order("opened_at", { ascending: false });
      if (error) {
        handleApiError(error);
        throw error;
      }
      return (data ?? []) as HrCase[];
    },
  });

  if (!canView)
    return <HrPermissionMessage area={mode === "admin" ? "HR person" : "Team member"} />;
  if (personQuery.isPending) return <HrLoading rows={7} />;
  if (personQuery.isError || !personQuery.data)
    return (
      <div className="p-5">
        <HrError
          message={
            personQuery.isError
              ? getErrorMessage(personQuery.error)
              : "This HR person record is not available."
          }
          retry={() => void personQuery.refetch()}
        />
      </div>
    );
  const person = personQuery.data;
  const refreshAll = async () => {
    await Promise.all([requestsQuery.refetch(), casesQuery.refetch(), personQuery.refetch()]);
  };

  const documents = (
    <HrSection
      title="Documents"
      action={
        <Button size="sm" onClick={() => setSendOpen(true)}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Send document
        </Button>
      }
    >
      {requestsQuery.isPending ? (
        <HrLoading rows={3} />
      ) : requestsQuery.isError ? (
        <HrError
          message={getErrorMessage(requestsQuery.error)}
          retry={() => void requestsQuery.refetch()}
        />
      ) : (
        <HrRequestsTable
          requests={requestsQuery.data ?? []}
          showPerson={false}
          onChanged={async () => {
            await requestsQuery.refetch();
          }}
        />
      )}
    </HrSection>
  );
  const notes = (
    <HrSection title="Notes">
      <HrNotesPanel staffId={staffId} />
    </HrSection>
  );
  const cases = (
    <HrSection
      title="Cases"
      action={
        <Button size="sm" variant="outline" onClick={() => setCaseOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Start case
        </Button>
      }
    >
      {casesQuery.isPending ? (
        <HrLoading rows={3} />
      ) : casesQuery.isError ? (
        <HrError
          message={getErrorMessage(casesQuery.error)}
          retry={() => void casesQuery.refetch()}
        />
      ) : (casesQuery.data ?? []).length === 0 ? (
        <HrEmpty title="No cases" description="Cases for this person will appear here." />
      ) : (
        <ul className="divide-y divide-row-divider">
          {(casesQuery.data ?? []).map((item) => (
            <li key={item.id}>
              <Link
                to="/hr/cases/$caseId"
                params={{ caseId: item.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {item.is_restricted ? <LockKeyhole className="h-3.5 w-3.5" /> : null}
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.steps_done}/{item.steps_total} steps · Owner {item.owner_name ?? "—"}
                  </span>
                </span>
                <HrStatusBadge status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HrSection>
  );

  return (
    <HrPage
      title={person.full_name}
      description={`${person.job_title ?? "—"} · ${person.work_email}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setCaseOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Start case
          </Button>
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send document
          </Button>
        </>
      }
    >
      <div className="px-5 pt-3">
        <Link
          to={mode === "admin" ? "/hr/people" : "/hr/team"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {mode === "admin" ? "People" : "My team"}
        </Link>
      </div>
      <div className="p-5">
        <Tabs defaultValue={mode === "admin" ? "overview" : "notes"}>
          <TabsList className="h-9 flex-wrap bg-surface-subtle p-1">
            {mode === "admin" ? (
              <>
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="pay" className="text-xs">
                  Employment & pay
                </TabsTrigger>
              </>
            ) : null}
            <TabsTrigger value="documents" className="text-xs">
              Documents
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              Notes
            </TabsTrigger>
            <TabsTrigger value="cases" className="text-xs">
              Cases
            </TabsTrigger>
          </TabsList>
          {mode === "admin" ? (
            <>
              <TabsContent value="overview" className="mt-4">
                <HrSection
                  title="Overview"
                  action={
                    canEdit ? (
                      <Button size="sm" variant="outline" onClick={() => setEmploymentOpen(true)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit employment
                      </Button>
                    ) : null
                  }
                >
                  <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <HrDetail label="Work email" value={person.work_email} />
                    <HrDetail label="Department" value={person.department} />
                    <HrDetail label="Grade" value={person.grade} />
                    <HrDetail label="Employment status" value={person.employment_status} />
                    <HrDetail label="Line manager" value={person.line_manager_name} />
                    <HrDetail label="Place of work" value={person.place_of_work} />
                    <HrDetail label="Start date" value={formatDate(person.start_date)} />
                    <HrDetail label="Probation end" value={formatDate(person.probation_end_date)} />
                    <HrDetail label="Leave date" value={formatDate(person.leave_date)} />
                  </dl>
                </HrSection>
              </TabsContent>
              <TabsContent value="pay" className="mt-4">
                <HrSection title="Employment & pay">
                  <div className="p-4">
                    <HrEmploymentPay person={person} canEdit={canEdit} />
                  </div>
                </HrSection>
              </TabsContent>
            </>
          ) : null}
          <TabsContent value="documents" className="mt-4">
            {documents}
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            {notes}
          </TabsContent>
          <TabsContent value="cases" className="mt-4">
            {cases}
          </TabsContent>
        </Tabs>
      </div>
      <HrSendDocumentDialog
        staffId={staffId}
        staffName={person.full_name}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={refreshAll}
      />
      <HrStartCaseDialog
        staffId={staffId}
        staffName={person.full_name}
        open={caseOpen}
        onOpenChange={setCaseOpen}
        onStarted={(caseId) => void navigate({ to: "/hr/cases/$caseId", params: { caseId } })}
      />
      {mode === "admin" ? (
        <HrEmploymentEditor
          person={person}
          open={employmentOpen}
          onOpenChange={setEmploymentOpen}
          onSaved={async () => {
            await personQuery.refetch();
          }}
        />
      ) : null}
    </HrPage>
  );
}
