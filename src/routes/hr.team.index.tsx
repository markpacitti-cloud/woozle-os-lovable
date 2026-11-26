import { createFileRoute } from "@tanstack/react-router";
import { HrTeamPage } from "@/components/hr/HrTeamPage";

export const Route = createFileRoute("/hr/team/")({
  head: () => ({
    meta: [
      { title: "My team · HR · Woozle OS" },
      { name: "description", content: "Your direct reports and their HR activity." },
      { property: "og:title", content: "My team · HR · Woozle OS" },
      { property: "og:description", content: "Your direct reports and their HR activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrTeamPage,
});
