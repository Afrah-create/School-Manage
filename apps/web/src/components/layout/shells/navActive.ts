import { flattenNavItems, navItemMatches } from "./navFlatten";
import type { NavItem } from "./types";

/** Picks the single nav item with the longest matching prefix (avoids parent + child both active). */
export function resolveActiveNavItem(items: NavItem[], pathname: string): NavItem | undefined {
  const leaves = flattenNavItems(items);
  let best: NavItem | undefined;
  let bestScore = -1;

  for (const item of leaves) {
    if (!navItemMatches(pathname, item)) continue;
    const prefix = item.activePrefix ?? item.href;
    const score = prefix.length;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

export function isNavItemActive(item: NavItem, pathname: string, items: NavItem[]): boolean {
  const active = resolveActiveNavItem(items, pathname);
  return active?.href === item.href;
}