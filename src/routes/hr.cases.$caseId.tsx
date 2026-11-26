import { createFileRoute } from "@tanstack/react-router";
import { HrCaseDetailPage } from "@/components/hr/HrCaseDetailPage";

export const Route = createFileRoute("/hr/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case · HR · Woozle OS" },
      { name: "description", content: "HR case checklist, documents and notes." },
      { property: "og:title", content: "Case · HR · Woozle OS" },
      { property: "og:description", content: "HR case checklist, documents and notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CaseRoute,
});
function CaseRoute() {
  const { caseId } = Route.useParams();
  return <HrCaseDetailPage caseId={caseId} />;
}
