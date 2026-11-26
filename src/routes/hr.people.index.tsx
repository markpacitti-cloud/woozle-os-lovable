import { createFileRoute } from "@tanstack/react-router";
import { HrPeoplePage } from "@/components/hr/HrPeoplePage";

export const Route = createFileRoute("/hr/people/")({
  head: () => ({
    meta: [
      { title: "People · HR · Woozle OS" },
      { name: "description", content: "Search and manage HR people records." },
      { property: "og:title", content: "People · HR · Woozle OS" },
      { property: "og:description", content: "Search and manage HR people records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrPeoplePage,
});
