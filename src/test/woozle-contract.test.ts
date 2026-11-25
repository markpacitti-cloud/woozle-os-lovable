import { describe, expect, it } from "vitest";

import { buildPeopleSearchOrFilter } from "@/components/people/PeopleListPage";
import {
  formatDateTime,
  formatMoney,
  parseGmailBannerFromUrl,
  parseOAuthErrorFromUrl,
} from "@/lib/format";
import {
  getAvailableSpaces,
  getPageLabelForPath,
  getSpaceFromPath,
  getVisibleGroups,
} from "@/lib/navigation";
import type { MyAccess } from "@/lib/types";

const baseAccess: MyAccess = {
  is_global_admin: false,
  companies_view: true,
  companies_edit: false,
  people_view: true,
  people_edit: false,
  deals_view: false,
  deals_edit: false,
  notes_view: false,
  notes_add: false,
  notes_change_any: false,
  tasks_sales_view: false,
  tasks_sales_edit: false,
  tasks_marketing_view: false,
  tasks_marketing_edit: false,
  blog_view: false,
  blog_edit: false,
  blog_approve: false,
  admin_view: false,
  admin_edit: false,
  can_hard_delete: false,
};

describe("Woozle OS contract rules", () => {
  it("formats dates in en-GB and uses an em dash for missing values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("2026-11-18T16:58:00Z")).toContain("18 Nov 2026");
  });

  it("formats currency values with GBP equivalent when non-GBP", () => {
    expect(formatMoney(null, "GBP")).toBe("—");
    expect(formatMoney(25000, "GBP")).toBe("£25,000");
    expect(formatMoney(10000, "USD", 7900)).toContain("£7,900");
  });

  it("maps Gmail OAuth callback params to contract banner messages", () => {
    expect(parseGmailBannerFromUrl("?connected=0&error=mailbox_mismatch")?.message).toBe(
      "That wasn't your Woozle mailbox",
    );
    expect(parseGmailBannerFromUrl("?connected=0&error=mailbox_already_connected")?.message).toBe(
      "Ask an admin",
    );
    expect(parseGmailBannerFromUrl("?connected=0&error=invalid_state")?.message).toBe(
      "Press Connect Gmail again",
    );
    expect(parseGmailBannerFromUrl("?connected=1&email=alex@woozleresearch.com")?.kind).toBe(
      "success",
    );
  });

  it("reads OAuth error_description from query or hash", () => {
    expect(
      parseOAuthErrorFromUrl("", "#error=access_denied&error_description=No+staff+record"),
    ).toBe("No staff record");
  });

  it("derives space from URL path and hides gated nav items and spaces", () => {
    expect(getSpaceFromPath("/companies")).toBe("sales");
    expect(getSpaceFromPath("/marketing/blog")).toBe("marketing");
    expect(getSpaceFromPath("/admin/staff-connections")).toBe("admin");

    const nonAdminSpaces = getAvailableSpaces(baseAccess).map((s) => s.id);
    expect(nonAdminSpaces).toEqual(["sales"]);

    const salesNavWithoutDeals = getVisibleGroups("sales", baseAccess)
      .flatMap((g) => g.items)
      .map((i) => i.label);
    expect(salesNavWithoutDeals).not.toContain("Deals");
    expect(salesNavWithoutDeals).toContain("Companies");

    const adminSpaces = getAvailableSpaces({ ...baseAccess, is_global_admin: true }).map(
      (s) => s.id,
    );
    expect(adminSpaces).toEqual(["sales", "marketing", "admin"]);
  });

  it("builds a safe PostgREST OR search filter for people name and primary email", () => {
    expect(buildPeopleSearchOrFilter("   ")).toBeNull();
    expect(buildPeopleSearchOrFilter("jane@acme.com")).toBe(
      "full_name.ilike.%jane@acme.com%,primary_email.ilike.%jane@acme.com%",
    );
    expect(buildPeopleSearchOrFilter("Doe, Jane (CEO)")).toBe(
      "full_name.ilike.%Doe  Jane  CEO%,primary_email.ilike.%Doe  Jane  CEO%",
    );
  });

  it("resolves Sales space and labels for /people routes", () => {
    expect(getSpaceFromPath("/people")).toBe("sales");
    expect(getSpaceFromPath("/people/123")).toBe("sales");
    expect(getPageLabelForPath("/people")).toBe("People");
    expect(getPageLabelForPath("/people/123")).toBe("Person");
  });
});