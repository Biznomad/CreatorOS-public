'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Campaign } from '../../api/types';
import { ColumnDef, Column } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { AD_TYPE_OPTIONS, PLATFORM_OPTIONS, STATUS_OPTIONS } from './options';
import { cn } from '@/lib/utils';

const AD_TYPE_LABELS: Record<Campaign['ad_type'], string> = {
  partnership_ad: 'Partnership',
  spark_ad: 'Spark',
  brand_ad: 'Brand'
};

const STATUS_VARIANT: Record<Campaign['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  draft: 'outline',
  paused: 'secondary',
  completed: 'secondary'
};

export const columns: ColumnDef<Campaign>[] = [
  {
    id: 'creator',
    accessorKey: 'creator_handle',
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Creator' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>@{row.original.creator_handle}</span>
        <span className='text-muted-foreground text-xs capitalize'>{row.original.creator_platform}</span>
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
    id: 'ad_type',
    accessorKey: 'ad_type',
    enableSorting: false,
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ cell }) => {
      const type = cell.getValue<Campaign['ad_type']>();
      return (
        <Badge variant='outline' className='capitalize'>
          {AD_TYPE_LABELS[type]}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Ad Type',
      variant: 'multiSelect' as const,
      options: AD_TYPE_OPTIONS
    }
  },
  {
    id: 'platform',
    accessorKey: 'platform',
    enableSorting: false,
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Platform' />
    ),
    cell: ({ cell }) => {
      const platform = cell.getValue<Campaign['platform']>();
      return (
        <Badge variant='outline' className='capitalize'>
          {platform === 'meta' ? 'Meta' : 'TikTok'}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Platform',
      variant: 'multiSelect' as const,
      options: PLATFORM_OPTIONS
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<Campaign['status']>();
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
    id: 'spend',
    accessorKey: 'spend',
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Spend' />
    ),
    cell: ({ cell }) => {
      const spend = cell.getValue<number>();
      return <span className='tabular-nums'>${spend.toLocaleString()}</span>;
    }
  },
  {
    id: 'roas',
    accessorKey: 'roas',
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='ROAS' />
    ),
    cell: ({ cell }) => {
      const roas = cell.getValue<number>();
      return (
        <span
          className={cn(
            'font-semibold tabular-nums',
            roas >= 2 ? 'text-green-600 dark:text-green-400' : roas >= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {roas.toFixed(2)}x
        </span>
      );
    }
  },
  {
    id: 'ctr',
    accessorKey: 'ctr',
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='CTR' />
    ),
    cell: ({ cell }) => {
      const ctr = cell.getValue<number>();
      return <span className='tabular-nums text-muted-foreground'>{ctr.toFixed(2)}%</span>;
    }
  },
  {
    id: 'conversions',
    accessorKey: 'conversions',
    header: ({ column }: { column: Column<Campaign, unknown> }) => (
      <DataTableColumnHeader column={column} title='Conversions' />
    ),
    cell: ({ cell }) => {
      const val = cell.getValue<number>();
      return <span className='tabular-nums'>{val.toLocaleString()}</span>;
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
