import { createFileRoute, notFound } from "@tanstack/react-router";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";
import { ADMIN_SECTIONS, getPageLabelForPath } from "@/lib/navigation";

export const Route = createFileRoute("/admin/$section")({
  beforeLoad: ({ params }) => {
    if (!ADMIN_SECTIONS.has(params.section)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const label = getPageLabelForPath(`/admin/${params.section}`);
    return {
      meta: [
        { title: `${label} · Admin · Woozle OS` },
        { name: "description", content: `${label} in Woozle OS Admin.` },
        { property: "og:title", content: `${label} · Admin · Woozle OS` },
        { property: "og:description", content: `${label} in Woozle OS Admin.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: AdminSectionPage,
});

function AdminSectionPage() {
  const { section } = Route.useParams();
  const label = getPageLabelForPath(`/admin/${section}`);
  return <ComingSoonPage spaceLabel="Admin" title={label} />;
}