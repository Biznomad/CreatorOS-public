import type { InfobarContent } from '@/components/ui/infobar';

export const usersInfoContent: InfobarContent = {
  title: 'Users & Team',
  sections: [
    {
      title: 'Overview',
      description:
        'Use this page to review CreatorOS account users, roles, invitation status, and workspace access. The table is backed by the authenticated dashboard API and stays scoped to the active brand workspace.',
      links: []
    },
    {
      title: 'Team Access',
      description:
        'Clerk manages sign-in identity and organization membership. CreatorOS uses the active workspace to isolate client brand data, integrations, billing status, and creator activation workflows.',
      links: []
    },
    {
      title: 'Filtering',
      description:
        'Search, pagination, and role filters are reflected in the URL so operators can share the exact team view they are reviewing.',
      links: []
    },
    {
      title: 'Operational Checks',
      description:
        'Before handing off a client workspace, confirm that the right admins are present, pending invitations are intentional, and the workspace shown in the sidebar matches the brand being launched.',
      links: []
    }
  ]
};
