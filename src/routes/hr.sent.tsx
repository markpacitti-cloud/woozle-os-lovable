import { createFileRoute } from "@tanstack/react-router";
import { HrSentPage } from "@/components/hr/HrSentPage";

export const Route = createFileRoute("/hr/sent")({
  head: () => ({
    meta: [
      { title: "Sent · HR · Woozle OS" },
      { name: "description", content: "Track, preview, resend and cancel HR requests." },
      { property: "og:title", content: "Sent · HR · Woozle OS" },
      { property: "og:description", content: "Track, preview, resend and cancel HR requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrSentPage,
});
