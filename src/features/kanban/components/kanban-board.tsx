'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Kanban, KanbanBoard as KanbanBoardPrimitive, KanbanOverlay } from '@/components/ui/kanban';
import { useTaskStore } from '../utils/store';
import { TaskColumn } from './board-column';
import { TaskCard } from './task-card';
import { createRestrictToContainer } from '../utils/restrict-to-container';
import { useBrandStore } from '@/components/org-switcher';

export function KanbanBoard() {
  const activeBrand = useBrandStore((s) => s.activeBrand);
  const activeBrandId = activeBrand.id;
  const { columns, counts, loading, setColumns, fetchCreators } = useTaskStore();

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators, activeBrandId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleCreatorCount = Object.values(columns).reduce((total, tasks) => total + tasks.length, 0);
  const knownCreatorCount = Object.values(counts).reduce((total, count) => total + count, 0);
  const hasActiveBrand = Boolean(activeBrandId);
  const showEmptyState = hasActiveBrand && !loading && visibleCreatorCount === 0 && knownCreatorCount === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory function, stable after mount
  const restrictToBoard = useCallback(
    createRestrictToContainer(() => containerRef.current),
    []
  );

  return (
    <div ref={containerRef} className='w-full max-w-full overflow-hidden'>
      <div className='mb-4 flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 text-sm font-semibold'>
            <Icons.product className='size-4 text-emerald-600' />
            Workspace data source
          </div>
          <p className='mt-1 truncate text-xs text-muted-foreground'>
            {hasActiveBrand ? activeBrand.name : 'Select a client workspace'}
            {' · '}
            {activeBrand.shopify_store ? activeBrand.shopify_store : 'No Shopify store attached'}
          </p>
        </div>
        <Button asChild size='sm' variant='outline' className='min-h-11 w-fit cursor-pointer gap-2'>
          <Link href='/dashboard/shopify'>
            <Icons.product className='size-3.5' />
            Shopify Import
          </Link>
        </Button>
      </div>

      {showEmptyState && (
        <div className='mb-4 rounded-lg border border-dashed bg-background p-5'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <Icons.sparkles className='size-4 text-indigo-500' />
                No creators loaded for this workspace
              </div>
              <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>
                Import Shopify customers for {activeBrand.name}, then matched buyers will appear here with order count, lifetime spend, and profile-photo status.
              </p>
            </div>
            <Button asChild className='w-fit cursor-pointer gap-2'>
              <Link href='/dashboard/shopify'>
                <Icons.product className='size-4' />
                Connect Shopify
              </Link>
            </Button>
          </div>
        </div>
      )}

      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
        modifiers={[restrictToBoard]}
        autoScroll={false}
      >
        <div className='w-full max-w-full overflow-x-auto rounded-md pb-4'>
          <KanbanBoardPrimitive className='flex w-max items-start'>
            {Object.entries(columns).map(([columnValue, tasks]) => (
              <TaskColumn key={columnValue} value={columnValue} tasks={tasks} />
            ))}
          </KanbanBoardPrimitive>
        </div>
        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === 'column') {
              const tasks = columns[value] ?? [];
              return <TaskColumn value={value} tasks={tasks} />;
            }

            const task = Object.values(columns)
              .flat()
              .find((task) => task.id === value);

            if (!task) return null;
            return <TaskCard task={task} />;
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}
