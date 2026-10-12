import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Atlas',
        url: '/dashboard/agent',
        icon: 'agent',
        isActive: false,
        shortcut: ['a', 't'],
        items: []
      },
      {
        title: 'Support Desk',
        url: '/dashboard/support',
        icon: 'help',
        isActive: false,
        shortcut: ['s', 'd'],
        items: []
      },
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Creators',
        url: '/dashboard/creators',
        icon: 'teams',
        shortcut: ['c', 'c'],
        isActive: false,
        items: []
      },
      {
        title: 'Pipeline',
        url: '/dashboard/kanban',
        icon: 'kanban',
        shortcut: ['p', 'p'],
        isActive: false,
        items: []
      },
      {
        title: 'Activation',
        url: '/dashboard/activation',
        icon: 'sparkles',
        shortcut: ['a', 'c'],
        isActive: false,
        items: []
      },
      {
        title: 'Discover',
        url: '/dashboard/discover',
        icon: 'search',
        shortcut: ['d', 'f'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Outreach',
    items: [
      {
        title: 'Messages',
        url: '/dashboard/outreach',
        icon: 'send',
        shortcut: ['o', 'o'],
        isActive: false,
        items: []
      },
      {
        title: 'Applications',
        url: '/dashboard/applications',
        icon: 'clipboard',
        shortcut: ['a', 'p'],
        isActive: false,
        items: []
      },
      {
        title: 'AI Proposals',
        url: '/dashboard/briefs',
        icon: 'sparkles',
        shortcut: ['b', 'b'],
        isActive: false,
        items: []
      },
      {
        title: 'Content Briefs',
        url: '/dashboard/content-briefs',
        icon: 'forms',
        isActive: false,
        items: []
      },
      {
        title: 'Agreements',
        url: '/dashboard/agreements',
        icon: 'fileTypeDoc',
        isActive: false,
        items: []
      },
      {
        title: 'Milestones',
        url: '/dashboard/milestones',
        icon: 'exclusive',
        isActive: false,
        items: []
      },
      {
        title: 'View Payouts',
        url: '/dashboard/payouts',
        icon: 'creditCard',
        isActive: false,
        items: []
      },
      {
        title: 'AI Tools',
        url: '/dashboard/ai-tools',
        icon: 'sparkles',
        shortcut: ['a', 'i'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Ads',
    items: [
      {
        title: 'Campaigns',
        url: '/dashboard/campaigns',
        icon: 'trendingUp',
        shortcut: ['a', 'a'],
        isActive: false,
        items: []
      },
      {
        title: 'Gifting',
        url: '/dashboard/shipments',
        icon: 'product',
        isActive: false,
        items: []
      },
      {
        title: 'Shopify Import',
        url: '/dashboard/shopify',
        icon: 'product',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Settings',
        url: '#',
        icon: 'settings',
        isActive: true,
        items: [
          {
            title: 'Profile',
            url: '/dashboard/profile',
            icon: 'profile',
            shortcut: ['m', 'm']
          },
          {
            title: 'Billing',
            url: '/dashboard/billing',
            icon: 'creditCard',
            shortcut: ['b', 'l']
          },
          {
            title: 'Workspaces',
            url: '/dashboard/workspaces',
            icon: 'workspace',
            shortcut: ['w', 'w']
          },
          {
            title: 'Users & Team',
            url: '/dashboard/users',
            icon: 'teams',
            shortcut: ['u', 'u']
          },
          {
            title: 'Notifications',
            url: '/dashboard/notifications',
            icon: 'notification',
            shortcut: ['n', 'n']
          },
          {
            title: 'Integrations',
            url: '/dashboard/integrations',
            icon: 'settings',
            shortcut: ['i', 'n']
          }
        ]
      }
    ]
  }
];
