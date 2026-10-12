'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/overview': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Overview', link: '/dashboard/overview' }
  ],
  '/dashboard/agent': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Atlas AI', link: '/dashboard/agent' }
  ],
  '/dashboard/briefs': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'AI Proposals', link: '/dashboard/briefs' }
  ],
  '/dashboard/content-briefs': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Content Briefs', link: '/dashboard/content-briefs' }
  ],
  '/dashboard/agreements': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Agreements', link: '/dashboard/agreements' }
  ],
  '/dashboard/milestones': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Milestones', link: '/dashboard/milestones' }
  ],
  '/dashboard/shipments': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Gifting', link: '/dashboard/shipments' }
  ],
  '/dashboard/shopify': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Shopify Import', link: '/dashboard/shopify' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' }
  ],
  '/dashboard/discover': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Discover Creators', link: '/dashboard/discover' }
  ],
  '/dashboard/billing': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Billing', link: '/dashboard/billing' }
  ],
  '/dashboard/workspaces': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Workspaces', link: '/dashboard/workspaces' }
  ],
  '/dashboard/workspaces/team': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Workspaces', link: '/dashboard/workspaces' },
    { title: 'Team', link: '/dashboard/workspaces/team' }
  ],
  '/dashboard/users': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Users & Team', link: '/dashboard/users' }
  ],
  '/dashboard/profile': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Profile', link: '/dashboard/profile' }
  ],
  '/dashboard/notifications': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Notifications', link: '/dashboard/notifications' }
  ],
  '/dashboard/ai-tools': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'AI Tools', link: '/dashboard/ai-tools' }
  ],
  '/dashboard/outreach': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Outreach CRM', link: '/dashboard/outreach' }
  ],
  '/dashboard/integrations': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Settings', link: '/dashboard/profile' },
    { title: 'Integrations', link: '/dashboard/integrations' }
  ]
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
