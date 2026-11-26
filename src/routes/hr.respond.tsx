import { createFileRoute } from "@tanstack/react-router";
import { HrPublicRespondPage } from "@/components/hr/HrPublicRespondPage";

export const Route = createFileRoute("/hr/respond")({
  validateSearch: (search): { token?: string } => {
    const token = search["token"];
    return typeof token === "string" && token ? { token } : {};
  },
  head: () => ({
    meta: [
      { title: "Secure document response · Woozle Research" },
      { name: "description", content: "Securely read and respond to a Woozle HR document." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Secure document response · Woozle Research" },
      { property: "og:description", content: "Securely read and respond to a Woozle HR document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicRespondRoute,
});
function PublicRespondRoute() {
  const { token } = Route.useSearch();
  return <HrPublicRespondPage token={token} />;
}
