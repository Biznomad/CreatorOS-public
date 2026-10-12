'use client';

/**
 * Navigation hooks — auth-free pass-through (no RBAC filtering).
 * All nav items are returned as-is. Add auth checks here when needed.
 */

import { useMemo } from 'react';
import type { NavItem, NavGroup } from '@/types';

/**
 * Returns all navigation items unfiltered.
 */
export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => items, [items]);
}

/**
 * Returns all navigation groups unfiltered (empty groups still removed).
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  return useMemo(
    () => groups.filter((group) => group.items.length > 0),
    [groups]
  );
}
