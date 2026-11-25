import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useMatch, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Handshake,
  Home,
  Inbox,
  LogOut,
  Mail,
  Menu,
  PenTool,
  Plug,
  Radio,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { AskWoozlePanel } from "@/components/chat/AskWoozlePanel";
import { GlobalSearchDialog } from "@/components/shell/GlobalSearchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  COMING_SOON_SPACES,
  SPACES,
  getAvailableSpaces,
  getPageLabelForPath,
  getSpaceFromPath,
  getVisibleGroups,
  type NavItemConfig,
} from "@/lib/navigation";
import type { CompanyDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

function NavIcon({ name, className }: { name: NavItemConfig["icon"]; className?: string }) {
  const cls = cn("h-4 w-4 shrink-0", className);
  switch (name) {
    case "home":
      return <Home className={cls} />;
    case "inbox":
      return <Inbox className={cls} />;
    case "tasks":
      return <CheckSquare className={cls} />;
    case "deals":
      return <Handshake className={cls} />;
    case "companies":
      return <Building2 className={cls} />;
    case "people":
      return <Users className={cls} />;
    case "meetings":
      return <Calendar className={cls} />;
    case "signals":
      return <Radio className={cls} />;
    case "outreach":
      return <Send className={cls} />;
    case "blog":
      return <FileText className={cls} />;
    case "authors":
      return <PenTool className={cls} />;
    case "social":
      return <Share2 className={cls} />;
    case "emails":
      return <Mail className={cls} />;
    case "audience":
      return <UserCheck className={cls} />;
    case "settings":
      return <Settings className={cls} />;
    case "connections":
      return <Plug className={cls} />;
    case "mailboxes":
      return <Mail className={cls} />;
    case "activity":
      return <Activity className={cls} />;
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "W";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, access, gmailBanner, dismissGmailBanner, signOut } = useAuth();

  const companyMatch = useMatch({ from: "/companies/$companyId", shouldThrow: false });
  const companyId = companyMatch?.params.companyId;
  const { data: cachedCompany } = useQuery<CompanyDetail | null>({
    queryKey: ["company", companyId],
    queryFn: () =>
      companyId ? (queryClient.getQueryData<CompanyDetail>(["company", companyId]) ?? null) : null,
    enabled: false,
  });

  const currentSpaceId = getSpaceFromPath(location.pathname);
  const currentSpace = SPACES[currentSpaceId];
  const availableSpaces = getAvailableSpaces(access);
  const navGroups = getVisibleGroups(currentSpaceId, access);
  const pageLabel = companyId
    ? (cachedCompany?.name ?? "Company")
    : getPageLabelForPath(location.pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigateToPath = (path: string) => {
    setMobileNavOpen(false);
    if (path === "/companies") {
      void navigate({ to: "/companies" });
      return;
    }
    if (path.startsWith("/marketing/")) {
      void navigate({
        to: "/marketing/$section",
        params: { section: path.slice("/marketing/".length) },
      });
      return;
    }
    if (path.startsWith("/admin/")) {
      void navigate({
        to: "/admin/$section",
        params: { section: path.slice("/admin/".length) },
      });
      return;
    }
    void navigate({ to: "/$section", params: { section: path.replace(/^\//, "") } });
  };

  const isActivePath = (path: string) => {
    if (path === "/companies") {
      return location.pathname === "/companies" || location.pathname.startsWith("/companies/");
    }
    return location.pathname === path;
  };

  const renderNavList = (collapsed: boolean) => (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label={`${currentSpace.label} navigation`}>
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed ? (
            <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(item.path);
              const btn = (
                <button
                  type="button"
                  onClick={() => navigateToPath(item.path)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    collapsed ? "justify-center px-0" : "justify-start",
                    active
                      ? "bg-nav-active font-medium text-nav-active-foreground"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <NavIcon
                    name={item.icon}
                    className={active ? "text-nav-active-foreground" : "text-muted-foreground"}
                  />
                  {!collapsed ? (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.tag ? (
                        <Badge variant="grey" className="ml-auto px-1.5 py-0 text-[10px]">
                          {item.tag}
                        </Badge>
                      ) : null}
                    </>
                  ) : null}
                </button>
              );

              return (
                <li key={item.path}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden h-7 w-7 text-muted-foreground md:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              {sidebarCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface-subtle px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  aria-label="Switch space"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-[5px] text-[11px] font-semibold",
                      currentSpace.badgeClass,
                    )}
                  >
                    {currentSpace.badgeLetter}
                  </span>
                  <span>{currentSpace.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Spaces</DropdownMenuLabel>
                {availableSpaces.map((space) => (
                  <DropdownMenuItem
                    key={space.id}
                    onClick={() => navigateToPath(space.defaultPath)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-[5px] text-[11px] font-semibold",
                        space.badgeClass,
                      )}
                    >
                      {space.badgeLetter}
                    </span>
                    <span className="text-sm">{space.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {COMING_SOON_SPACES.map((label) => (
                  <DropdownMenuItem key={label} disabled className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <span className="text-[11px] text-muted-foreground">Coming soon</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span>/</span>
              {companyId ? (
                <>
                  <Link to="/companies" className="hover:text-foreground">
                    Companies
                  </Link>
                  <span>/</span>
                </>
              ) : null}
              <span className="truncate font-medium text-foreground">{pageLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface-subtle px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search everything</span>
              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1280) {
                  setMobileChatOpen((prev) => !prev);
                } else {
                  setChatOpen((prev) => !prev);
                }
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-link" />
              <span className="hidden sm:inline">Ask Woozle</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-subtle text-[11px] font-semibold text-foreground">
                    {getInitials(profile?.full_name)}
                  </span>
                  <span className="hidden max-w-[140px] truncate md:inline">
                    {profile?.full_name ?? "Staff"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium text-foreground">
                    {profile?.full_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{profile?.work_email}</p>
                  {profile?.roles?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {profile.roles.map((role) => (
                        <Badge key={role} variant="grey">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {gmailBanner ? (
          <div
            role="status"
            className={cn(
              "flex items-center justify-between border-b border-border px-4 py-2 text-xs",
              gmailBanner.kind === "success"
                ? "bg-tag-green text-tag-green-foreground"
                : "bg-tag-red text-tag-red-foreground",
            )}
          >
            <span>{gmailBanner.message}</span>
            <button
              type="button"
              aria-label="Dismiss banner"
              onClick={dismissGmailBanner}
              className="ml-4 rounded p-0.5 hover:opacity-80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className={cn(
              "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-150 md:flex",
              sidebarCollapsed ? "w-16" : "w-[216px]",
            )}
          >
            {renderNavList(sidebarCollapsed)}
            <div className="border-t border-border p-2.5">
              {sidebarCollapsed ? (
                <div className="flex justify-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold text-foreground">
                    {getInitials(profile?.full_name)}
                  </span>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {profile?.full_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {profile?.roles?.join(", ") || "Staff"}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-[240px] bg-sidebar p-0">
              <SheetTitle className="flex h-12 items-center border-b border-border px-4 text-sm font-semibold">
                Woozle OS · {currentSpace.label}
              </SheetTitle>
              {renderNavList(false)}
            </SheetContent>
          </Sheet>

          <main className="min-w-0 flex-1 overflow-y-auto bg-background">{children}</main>

          {chatOpen ? (
            <div className="hidden w-[360px] shrink-0 border-l border-border xl:block">
              <AskWoozlePanel
                space={currentSpaceId}
                companyId={companyId}
                companyName={cachedCompany?.name}
                onClose={() => setChatOpen(false)}
              />
            </div>
          ) : null}

          <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
            <SheetContent side="right" className="w-full p-0 sm:max-w-[380px] [&>button]:hidden">
              <SheetTitle className="sr-only">Ask Woozle</SheetTitle>
              <AskWoozlePanel
                space={currentSpaceId}
                companyId={companyId}
                companyName={cachedCompany?.name}
                onClose={() => setMobileChatOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}