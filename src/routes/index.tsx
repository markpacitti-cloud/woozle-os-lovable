import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Woozle OS" },
      { name: "description", content: "Woozle OS placeholder page." },
      { property: "og:title", content: "Woozle OS" },
      { property: "og:description", content: "Woozle OS placeholder page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Woozle OS
      </h1>
    </main>
  );
}
