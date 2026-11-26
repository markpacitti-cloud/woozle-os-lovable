import { createFileRoute } from "@tanstack/react-router";
import { HrMyPage } from "@/components/hr/HrMyPage";

export const Route = createFileRoute("/hr/my")({
  validateSearch: (search): { request?: string } => {
    const request = search["request"];
    return typeof request === "string" && request ? { request } : {};
  },
  head: () => ({
    meta: [
      { title: "My HR · Woozle OS" },
      { name: "description", content: "Your HR documents, requests and personal details." },
      { property: "og:title", content: "My HR · Woozle OS" },
      { property: "og:description", content: "Your HR documents, requests and personal details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyHrRoute,
});

function MyHrRoute() {
  const { request } = Route.useSearch();
  return <HrMyPage requestId={request} />;
}
