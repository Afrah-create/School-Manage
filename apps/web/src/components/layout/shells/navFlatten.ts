import type { NavItem } from "./types";

export function navItemMatches(pathname: string, item: NavItem): boolean {
  if (item.href.endsWith("/dashboard")) return pathname === item.href;
  if (item.exactMatch) return pathname === item.href;
  const prefix = item.activePrefix ?? item.href;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Leaf nav entries used for active-route resolution and search indexing. */
export function flattenNavItems(items: NavItem[]): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flattenNavItems(item.children));
    } else {
      out.push(item);
    }
  }
  return out;
}

export function isNavGroupActive(item: NavItem, pathname: string): boolean {
  if (!item.children?.length) return false;
  if (item.children.some((child) => navItemMatches(pathname, child))) return true;
  const prefix = item.activePrefix ?? item.href;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
