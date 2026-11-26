import { createFileRoute } from "@tanstack/react-router";
import { HrApprovalsPage } from "@/components/hr/HrApprovalsPage";

export const Route = createFileRoute("/hr/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals · HR · Woozle OS" },
      { name: "description", content: "Preview and decide HR letters awaiting approval." },
      { property: "og:title", content: "Approvals · HR · Woozle OS" },
      { property: "og:description", content: "Preview and decide HR letters awaiting approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrApprovalsPage,
});
