import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CompaniesListPage } from "@/components/companies/CompaniesListPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Woozle OS" },
      { name: "description", content: "Woozle OS staff workspace." },
      { property: "og:title", content: "Woozle OS" },
      { property: "og:description", content: "Woozle OS staff workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/companies", replace: true });
  }, [navigate]);

  return <CompaniesListPage />;
}
