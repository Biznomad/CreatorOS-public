'use client';

import { parseAsInteger, useQueryStates } from 'nuqs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';

interface CreatorPaginationProps {
  totalCreators: number;
}

export function CreatorPagination({ totalCreators }: CreatorPaginationProps) {
  const [params, setParams] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      perPage: parseAsInteger.withDefault(50)
    },
    { shallow: true }
  );

  const totalPages = Math.max(1, Math.ceil(totalCreators / params.perPage));
  const currentPage = Math.min(params.page, totalPages);
  const startItem = (currentPage - 1) * params.perPage + 1;
  const endItem = Math.min(currentPage * params.perPage, totalCreators);

  function goToPage(page: number) {
    setParams({ page: Math.max(1, Math.min(page, totalPages)) });
  }

  function setPerPage(value: string) {
    setParams({ perPage: Number(value), page: 1 });
  }

  // Generate page numbers to show
  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4'>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <span>
          Showing {startItem}–{endItem} of {totalCreators} creators
        </span>
      </div>
      <div className='flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm text-muted-foreground'>Per page</span>
          <Select value={String(params.perPage)} onValueChange={setPerPage}>
            <SelectTrigger aria-label='Creators per page' className='min-h-11 w-[76px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='50'>50</SelectItem>
              <SelectItem value='100'>100</SelectItem>
              <SelectItem value='150'>150</SelectItem>
              <SelectItem value='200'>200</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex max-w-full flex-wrap items-center gap-1'>
          <Button
            aria-label='Go to first creators page'
            variant='outline'
            size='icon'
            className='min-h-11 min-w-11'
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
          >
            <Icons.chevronsLeft className='size-4' />
          </Button>
          <Button
            aria-label='Go to previous creators page'
            variant='outline'
            size='icon'
            className='min-h-11 min-w-11'
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <Icons.chevronLeft className='size-4' />
          </Button>
          <span className='sm:hidden px-2 text-xs font-medium'>
            {currentPage} / {totalPages}
          </span>
          {getPageNumbers().map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className='hidden sm:inline px-1 text-muted-foreground'>
                ...
              </span>
            ) : (
              <Button
                aria-label={`Go to creators page ${p}`}
                key={p}
                variant={p === currentPage ? 'default' : 'outline'}
                size='icon'
                className='hidden min-h-11 min-w-11 text-xs sm:inline-flex'
                onClick={() => goToPage(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            aria-label='Go to next creators page'
            variant='outline'
            size='icon'
            className='min-h-11 min-w-11'
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            <Icons.chevronRight className='size-4' />
          </Button>
          <Button
            aria-label='Go to last creators page'
            variant='outline'
            size='icon'
            className='min-h-11 min-w-11'
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(totalPages)}
          >
            <Icons.chevronsRight className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
