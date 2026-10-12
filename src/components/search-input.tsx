'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import type { NavGroup, NavItem } from '@/types';
import { Button } from './ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from './ui/command';
import { cn } from '@/lib/utils';

type SearchAction = NavItem & {
  section: string;
};

function getNavigationActions(groups: NavGroup[]) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      const actions: SearchAction[] = [];

      if (item.url !== '#') {
        actions.push({ ...item, section: group.label || 'Navigation' });
      }

      item.items?.forEach((child) => {
        actions.push({ ...child, section: item.title });
      });

      return actions;
    })
  );
}

function withCurrentQaParam(url: string) {
  if (typeof window === 'undefined' || !window.location.search.includes('qa=1')) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}qa=1`;
}

export default function SearchInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const actions = useMemo(() => getNavigationActions(filteredGroups), [filteredGroups]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runAction = (url: string) => {
    setOpen(false);
    router.push(withCurrentQaParam(url));
  };

  return (
    <div className='w-full space-y-2'>
      <Button
        variant='outline'
        aria-label='Open command palette'
        className={cn(
          'bg-background text-muted-foreground relative min-h-11 rounded-[0.5rem] text-sm font-normal shadow-none',
          compact
            ? 'min-w-11 justify-center p-0'
            : 'w-full justify-start sm:pr-12 md:w-40 lg:w-64'
        )}
        onClick={() => setOpen(true)}
      >
        <Icons.search className={cn('h-4 w-4', !compact && 'mr-2')} />
        <span className={compact ? 'sr-only' : undefined}>Search...</span>
        <kbd className={cn(
          'bg-muted pointer-events-none absolute top-1/2 right-2 h-6 -translate-y-1/2 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none',
          compact ? 'hidden' : 'hidden sm:flex'
        )}>
          <span className='text-xs'>⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title='Command Palette'
        description='Search CreatorOS dashboard pages'
      >
        <CommandInput placeholder='Search dashboard pages...' />
        <CommandList>
          <CommandEmpty>No dashboard pages found.</CommandEmpty>
          {filteredGroups.map((group) => {
            const groupActions = actions.filter(
              (action) => action.section === (group.label || 'Navigation')
            );

            return groupActions.length > 0 ? (
              <CommandGroup key={group.label || 'Navigation'} heading={group.label || 'Navigation'}>
                {groupActions.map((action) => {
                  const Icon = action.icon ? Icons[action.icon] : Icons.circle;

                  return (
                    <CommandItem
                      key={`${action.section}-${action.title}`}
                      value={`${action.section} ${action.title}`}
                      className='min-h-11'
                      onSelect={() => runAction(action.url)}
                    >
                      <Icon className='size-4' />
                      <span>{action.title}</span>
                      {action.shortcut ? (
                        <CommandShortcut>{action.shortcut.join(' ')}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null;
          })}
          <CommandGroup heading='Settings'>
            {actions
              .filter((action) => action.section === 'Settings')
              .map((action) => {
                const Icon = action.icon ? Icons[action.icon] : Icons.circle;

                return (
                  <CommandItem
                    key={`${action.section}-${action.title}`}
                    value={`${action.section} ${action.title}`}
                    className='min-h-11'
                    onSelect={() => runAction(action.url)}
                  >
                    <Icon className='size-4' />
                    <span>{action.title}</span>
                    {action.shortcut ? (
                      <CommandShortcut>{action.shortcut.join(' ')}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                );
              })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
