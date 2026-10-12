'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { OutreachMessage } from '../../api/types';
import { ColumnDef, Column } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { STATUS_OPTIONS, CHANNEL_OPTIONS } from './options';

const STATUS_VARIANT: Record<OutreachMessage['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  sent: 'secondary',
  replied: 'secondary',
  interested: 'default',
  declined: 'destructive'
};

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export const columns: ColumnDef<OutreachMessage>[] = [
  {
    id: 'creator',
    accessorKey: 'creator_handle',
    header: ({ column }: { column: Column<OutreachMessage, unknown> }) => (
      <DataTableColumnHeader column={column} title='Creator' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>@{row.original.creator_handle}</span>
        <span className='text-muted-foreground text-xs'>{row.original.creator_display_name}</span>
      </div>
    ),
    meta: {
      label: 'Creator',
      placeholder: 'Search creators...',
      variant: 'text' as const,
      icon: Icons.user
    },
    enableColumnFilter: true
  },
  {
    id: 'channel',
    accessorKey: 'channel',
    enableSorting: false,
    header: ({ column }: { column: Column<OutreachMessage, unknown> }) => (
      <DataTableColumnHeader column={column} title='Channel' />
    ),
    cell: ({ cell }) => {
      const channel = cell.getValue<OutreachMessage['channel']>();
      return (
        <Badge variant='outline' className='uppercase'>
          {channel}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Channel',
      variant: 'multiSelect' as const,
      options: CHANNEL_OPTIONS
    }
  },
  {
    id: 'message',
    accessorKey: 'message',
    enableSorting: false,
    header: 'MESSAGE',
    cell: ({ cell }) => {
      const msg = cell.getValue<string>();
      return (
        <span className='text-muted-foreground max-w-xs text-sm' title={msg}>
          {truncate(msg, 80)}
        </span>
      );
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    header: ({ column }: { column: Column<OutreachMessage, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<OutreachMessage['status']>();
      return (
        <Badge variant={STATUS_VARIANT[status]} className='capitalize'>
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Status',
      variant: 'multiSelect' as const,
      options: STATUS_OPTIONS
    }
  },
  {
    id: 'sent_at',
    accessorKey: 'sent_at',
    header: ({ column }: { column: Column<OutreachMessage, unknown> }) => (
      <DataTableColumnHeader column={column} title='Sent' />
    ),
    cell: ({ cell }) => {
      const val = cell.getValue<string | null>();
      return <span className='text-muted-foreground text-sm'>{formatDate(val)}</span>;
    }
  },
  {
    id: 'follow_up_count',
    accessorKey: 'follow_up_count',
    header: ({ column }: { column: Column<OutreachMessage, unknown> }) => (
      <DataTableColumnHeader column={column} title='Follow-ups' />
    ),
    cell: ({ cell }) => {
      const count = cell.getValue<number>();
      return <span className='tabular-nums'>{count}</span>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
