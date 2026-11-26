import { createFileRoute } from "@tanstack/react-router";
import { HrPoliciesPage } from "@/components/hr/HrPoliciesPage";

export const Route = createFileRoute("/hr/policies")({
  head: () => ({
    meta: [
      { title: "Policies · HR · Woozle OS" },
      { name: "description", content: "Search and read current Woozle policies." },
      { property: "og:title", content: "Policies · HR · Woozle OS" },
      { property: "og:description", content: "Search and read current Woozle policies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrPoliciesPage,
});
