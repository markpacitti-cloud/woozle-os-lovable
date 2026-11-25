import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ComingSoonPageProps {
  spaceLabel: string;
  title: string;
}

export function ComingSoonPage({ spaceLabel, title }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
        <Clock className="h-4 w-4" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {spaceLabel} · {title} is coming soon.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-5">
        <Link to="/companies">Go to Companies</Link>
      </Button>
    </div>
  );
}