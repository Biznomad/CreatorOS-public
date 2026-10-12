'use client';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Creator } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { STATUS_OPTIONS, PLATFORM_OPTIONS } from './options';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatNiche(niche: string): string {
  if (!niche) return '';
  return niche
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 font-semibold dark:text-green-400';
  if (score >= 70) return 'text-yellow-600 font-semibold dark:text-yellow-400';
  return 'text-red-500 font-semibold dark:text-red-400';
}

function hasMeasuredValue(value: number) {
  return Number.isFinite(value) && value > 0;
}

function getStatusVariant(
  status: Creator['status']
): 'outline' | 'secondary' | 'default' {
  switch (status) {
    case 'discovered':
      return 'outline';
    case 'contacted':
      return 'secondary';
    case 'replied':
    case 'negotiating':
    case 'onboarded':
    case 'active':
    default:
      return 'default';
  }
}

export function getColumns(onViewProfile: (creator: Creator) => void): ColumnDef<Creator>[] {
  return [
  {
    id: 'creator',
    accessorFn: (row) => `${row.handle} ${row.display_name}`,
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Creator' />
    ),
    cell: ({ row }) => {
      const { handle, display_name, avatar_url, niche } = row.original;
      return (
        <div className='flex items-center gap-3'>
          <Avatar className='size-8 bg-muted'>
            <AvatarImage src={avatar_url} alt={display_name} />
            <AvatarFallback>{(display_name || handle).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>@{handle}</span>
            <span className='text-muted-foreground text-xs'>{formatNiche(niche)}</span>
          </div>
        </div>
      );
    },
    meta: {
      label: 'Creator',
      placeholder: 'Search creators...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'platform',
    accessorKey: 'platform',
    enableSorting: false,
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Platform' />
    ),
    cell: ({ cell }) => {
      const platform = cell.getValue<Creator['platform']>();
      return (
        <Badge variant='outline' className='capitalize'>
          {platform === 'tiktok' ? 'TikTok' : 'Instagram'}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Platform',
      variant: 'select' as const,
      options: PLATFORM_OPTIONS
    }
  },
  {
    id: 'follower_count',
    accessorKey: 'follower_count',
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Followers' />
    ),
    cell: ({ cell }) => (
      <span className='tabular-nums'>{formatFollowers(cell.getValue<number>())}</span>
    )
  },
  {
    id: 'engagement_rate',
    accessorKey: 'engagement_rate',
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Engagement' />
    ),
    cell: ({ cell }) => {
      const engagement = cell.getValue<number>();
      return (
        <span className={hasMeasuredValue(engagement) ? 'tabular-nums' : 'text-muted-foreground'}>
          {hasMeasuredValue(engagement) ? `${engagement.toFixed(1)}%` : 'Pending'}
        </span>
      );
    }
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Score' />
    ),
    cell: ({ cell }) => {
      const score = cell.getValue<number>();
      return hasMeasuredValue(score)
        ? <span className={getScoreColor(score)}>{score}</span>
        : <span className='text-muted-foreground'>Unscored</span>;
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    header: ({ column }: { column: Column<Creator, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<Creator['status']>();
      return (
        <Badge variant={getStatusVariant(status)} className='capitalize'>
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Status',
      variant: 'select' as const,
      options: STATUS_OPTIONS
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} onViewProfile={onViewProfile} />
  }
  ];
}
