import { createFileRoute } from "@tanstack/react-router";

import { CompaniesListPage } from "@/components/companies/CompaniesListPage";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Companies · Sales · Woozle OS" },
      { name: "description", content: "Browse and manage Sales companies in Woozle OS." },
      { property: "og:title", content: "Companies · Sales · Woozle OS" },
      { property: "og:description", content: "Browse and manage Sales companies in Woozle OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompaniesListPage,
});