import { createFileRoute } from "@tanstack/react-router";
import { HrStaffRecord } from "@/components/hr/HrStaffRecord";

export const Route = createFileRoute("/hr/team/$staffId")({
  head: () => ({
    meta: [
      { title: "Team member · HR · Woozle OS" },
      { name: "description", content: "Direct-report documents, notes and cases." },
      { property: "og:title", content: "Team member · HR · Woozle OS" },
      { property: "og:description", content: "Direct-report documents, notes and cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamMemberRoute,
});

function TeamMemberRoute() {
  const { staffId } = Route.useParams();
  return <HrStaffRecord staffId={staffId} mode="team" />;
}
