import { createFileRoute } from "@tanstack/react-router";
import { HrStaffRecord } from "@/components/hr/HrStaffRecord";

export const Route = createFileRoute("/hr/people/$staffId")({
  head: () => ({
    meta: [
      { title: "Person record · HR · Woozle OS" },
      { name: "description", content: "HR employment, pay, documents, notes and cases." },
      { property: "og:title", content: "Person record · HR · Woozle OS" },
      { property: "og:description", content: "HR employment, pay, documents, notes and cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrPersonRoute,
});

function HrPersonRoute() {
  const { staffId } = Route.useParams();
  return <HrStaffRecord staffId={staffId} mode="admin" />;
}
