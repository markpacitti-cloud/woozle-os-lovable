import { createFileRoute, notFound } from "@tanstack/react-router";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";
import { MARKETING_SECTIONS, getPageLabelForPath } from "@/lib/navigation";

export const Route = createFileRoute("/marketing/$section")({
  beforeLoad: ({ params }) => {
    if (!MARKETING_SECTIONS.has(params.section)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const label = getPageLabelForPath(`/marketing/${params.section}`);
    return {
      meta: [
        { title: `${label} · Marketing · Woozle OS` },
        { name: "description", content: `${label} in Woozle OS Marketing.` },
        { property: "og:title", content: `${label} · Marketing · Woozle OS` },
        { property: "og:description", content: `${label} in Woozle OS Marketing.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: MarketingSectionPage,
});

function MarketingSectionPage() {
  const { section } = Route.useParams();
  const label = getPageLabelForPath(`/marketing/${section}`);
  return <ComingSoonPage spaceLabel="Marketing" title={label} />;
}