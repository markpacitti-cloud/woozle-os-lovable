import { createFileRoute } from "@tanstack/react-router";
import { HrCasesPage } from "@/components/hr/HrCasesPage";

export const Route = createFileRoute("/hr/cases/")({
  head: () => ({
    meta: [
      { title: "Cases · HR · Woozle OS" },
      { name: "description", content: "HR case board by status." },
      { property: "og:title", content: "Cases · HR · Woozle OS" },
      { property: "og:description", content: "HR case board by status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrCasesPage,
});
