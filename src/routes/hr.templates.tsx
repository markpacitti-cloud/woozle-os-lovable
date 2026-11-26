import { createFileRoute } from "@tanstack/react-router";
import { HrTemplatesPage } from "@/components/hr/HrTemplatesPage";

export const Route = createFileRoute("/hr/templates")({
  head: () => ({
    meta: [
      { title: "Templates & Policies · HR · Woozle OS" },
      { name: "description", content: "Edit, version and publish HR documents and policies." },
      { property: "og:title", content: "Templates & Policies · HR · Woozle OS" },
      {
        property: "og:description",
        content: "Edit, version and publish HR documents and policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrTemplatesPage,
});
