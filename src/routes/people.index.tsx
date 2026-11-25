import { createFileRoute } from "@tanstack/react-router";

import { PeopleListPage } from "@/components/people/PeopleListPage";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "People · Sales · Woozle OS" },
      { name: "description", content: "Browse and manage Sales people in Woozle OS." },
      { property: "og:title", content: "People · Sales · Woozle OS" },
      { property: "og:description", content: "Browse and manage Sales people in Woozle OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeopleListPage,
});