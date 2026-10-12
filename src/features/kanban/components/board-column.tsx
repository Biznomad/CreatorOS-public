'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KanbanColumn, KanbanColumnHandle } from '@/components/ui/kanban';
import { useTaskStore, type CreatorCard } from '../utils/store';
import { TaskCard } from './task-card';

const COLUMN_TITLES: Record<string, string> = {
  discovered: 'Discovered',
  contacted: 'Contacted',
  replied: 'Replied',
  negotiating: 'Negotiating',
  onboarded: 'Onboarded',
  active: 'Active'
};

interface TaskColumnProps extends Omit<React.ComponentProps<typeof KanbanColumn>, 'children'> {
  tasks: CreatorCard[];
}

export function TaskColumn({ value, tasks, ...props }: TaskColumnProps) {
  const totalCount = useTaskStore((s) => s.counts[value] ?? tasks.length);

  return (
    <KanbanColumn value={value} className='w-[320px] shrink-0' {...props}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold'>
            {COLUMN_TITLES[value] ?? String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </span>
          <Badge variant='secondary' className='pointer-events-none rounded-sm'>
            {totalCount > tasks.length ? `${tasks.length} of ${totalCount.toLocaleString()}` : tasks.length}
          </Badge>
        </div>
        <KanbanColumnHandle asChild>
          <Button
            variant='ghost'
            size='icon'
            className='min-h-11 min-w-11'
            aria-label={`Reorder ${COLUMN_TITLES[value] ?? String(value)} column`}
          >
            <Icons.gripVertical className='h-4 w-4' />
          </Button>
        </KanbanColumnHandle>
      </div>
      <div className='flex flex-col gap-2 p-0.5'>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </KanbanColumn>
  );
}
