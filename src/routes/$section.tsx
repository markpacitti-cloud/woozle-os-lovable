import { createFileRoute, notFound } from "@tanstack/react-router";

import { ComingSoonPage } from "@/components/shell/ComingSoonPage";
import { SALES_SECTIONS, getPageLabelForPath } from "@/lib/navigation";

export const Route = createFileRoute("/$section")({
  beforeLoad: ({ params }) => {
    if (!SALES_SECTIONS.has(params.section)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const label = getPageLabelForPath(`/${params.section}`);
    return {
      meta: [
        { title: `${label} · Sales · Woozle OS` },
        { name: "description", content: `${label} in Woozle OS Sales.` },
        { property: "og:title", content: `${label} · Sales · Woozle OS` },
        { property: "og:description", content: `${label} in Woozle OS Sales.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SalesSectionPage,
});

function SalesSectionPage() {
  const { section } = Route.useParams();
  const label = getPageLabelForPath(`/${section}`);
  return <ComingSoonPage spaceLabel="Sales" title={label} />;
}