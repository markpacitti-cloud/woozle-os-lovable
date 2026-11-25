import type { MyAccess } from "@/lib/types";

export type SpaceId = "sales" | "marketing" | "admin";

export interface SpaceConfig {
  id: SpaceId;
  label: string;
  badgeLetter: string;
  badgeClass: string;
  defaultPath: string;
}

export interface NavItemConfig {
  label: string;
  path: string;
  icon:
    | "home"
    | "inbox"
    | "tasks"
    | "deals"
    | "companies"
    | "people"
    | "meetings"
    | "signals"
    | "outreach"
    | "blog"
    | "authors"
    | "social"
    | "emails"
    | "audience"
    | "settings"
    | "connections"
    | "mailboxes"
    | "activity";
  implemented?: boolean;
  tag?: string;
  requires?: (access: MyAccess | null) => boolean;
}

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

export const SPACES: Record<SpaceId, SpaceConfig> = {
  sales: {
    id: "sales",
    label: "Sales",
    badgeLetter: "S",
    badgeClass: "bg-space-sales text-primary-foreground",
    defaultPath: "/companies",
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    badgeLetter: "M",
    badgeClass: "bg-space-marketing text-primary-foreground",
    defaultPath: "/marketing/blog",
  },
  admin: {
    id: "admin",
    label: "Admin",
    badgeLetter: "A",
    badgeClass: "bg-space-admin text-primary-foreground",
    defaultPath: "/admin/staff-connections",
  },
};

export const COMING_SOON_SPACES = ["Finance", "HR"] as const;

export const SPACE_NAV: Record<SpaceId, NavGroupConfig[]> = {
  sales: [
    {
      label: "General",
      items: [
        { label: "Start", path: "/start", icon: "home" },
        { label: "Inbox", path: "/inbox", icon: "inbox" },
        { label: "Tasks", path: "/tasks", icon: "tasks" },
      ],
    },
    {
      label: "Records",
      items: [
        {
          label: "Deals",
          path: "/deals",
          icon: "deals",
          requires: (access) => Boolean(access?.deals_view || access?.is_global_admin),
        },
        { label: "Companies", path: "/companies", icon: "companies", implemented: true },
        { label: "People", path: "/people", icon: "people" },
        { label: "Meetings", path: "/meetings", icon: "meetings" },
      ],
    },
    {
      label: "Growth",
      items: [
        { label: "Signals", path: "/signals", icon: "signals", tag: "Later" },
        { label: "Outreach", path: "/outreach", icon: "outreach", tag: "Later" },
      ],
    },
  ],
  marketing: [
    {
      label: "General",
      items: [
        { label: "Inbox", path: "/marketing/inbox", icon: "inbox" },
        { label: "Tasks", path: "/marketing/tasks", icon: "tasks" },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Blog", path: "/marketing/blog", icon: "blog" },
        { label: "Authors", path: "/marketing/authors", icon: "authors" },
      ],
    },
    {
      label: "Later",
      items: [
        { label: "Social", path: "/marketing/social", icon: "social", tag: "Later" },
        { label: "Emails", path: "/marketing/emails", icon: "emails", tag: "Later" },
        { label: "Audience", path: "/marketing/audience", icon: "audience", tag: "Later" },
      ],
    },
    {
      label: "Configuration",
      items: [
        {
          label: "Settings",
          path: "/marketing/settings",
          icon: "settings",
          requires: (access) => Boolean(access?.admin_edit || access?.is_global_admin),
        },
      ],
    },
  ],
  admin: [
    {
      label: "Administration",
      items: [
        { label: "Staff connections", path: "/admin/staff-connections", icon: "connections" },
        { label: "Mailbox spaces", path: "/admin/mailbox-spaces", icon: "mailboxes" },
        { label: "Activity log", path: "/admin/activity", icon: "activity" },
      ],
    },
  ],
};

export const SALES_SECTIONS = new Set([
  "start",
  "inbox",
  "tasks",
  "deals",
  "people",
  "meetings",
  "signals",
  "outreach",
]);

export const MARKETING_SECTIONS = new Set([
  "inbox",
  "tasks",
  "blog",
  "authors",
  "social",
  "emails",
  "audience",
  "settings",
]);

export const ADMIN_SECTIONS = new Set(["staff-connections", "mailbox-spaces", "activity"]);

export function getSpaceFromPath(pathname: string): SpaceId {
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) return "marketing";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return "sales";
}

export function getAvailableSpaces(access: MyAccess | null): SpaceConfig[] {
  const list: SpaceConfig[] = [];
  if (
    !access ||
    access.is_global_admin ||
    access.companies_view ||
    access.people_view ||
    access.deals_view ||
    access.tasks_sales_view
  ) {
    list.push(SPACES.sales);
  }
  if (access?.is_global_admin || access?.blog_view || access?.tasks_marketing_view) {
    list.push(SPACES.marketing);
  }
  if (access?.is_global_admin || access?.admin_view) {
    list.push(SPACES.admin);
  }
  return list.length > 0 ? list : [SPACES.sales];
}

export function getVisibleGroups(space: SpaceId, access: MyAccess | null): NavGroupConfig[] {
  return SPACE_NAV[space]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.requires ? item.requires(access) : true)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getPageLabelForPath(pathname: string): string {
  if (pathname === "/" || pathname === "/companies") return "Companies";
  if (pathname.startsWith("/companies/")) return "Company";
  for (const groups of Object.values(SPACE_NAV)) {
    for (const group of groups) {
      for (const item of group.items) {
        if (item.path === pathname) return item.label;
      }
    }
  }
  return "Workspace";
}