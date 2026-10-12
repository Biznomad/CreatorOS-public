// Legacy overview page — not used (parallel routes layout handles overview).
// Kept for compatibility; passes empty data to chart components.

import PageContainer from '@/components/layout/page-container';
import { AreaGraph } from './area-graph';
import { BarGraph } from './bar-graph';
import { PieGraph } from './pie-graph';
import { RecentSales } from './recent-sales';

export default function OverViewPage() {
  return (
    <PageContainer>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
        <div className='col-span-4'>
          <BarGraph data={[]} />
        </div>
        <div className='col-span-4 md:col-span-3'>
          <RecentSales creators={[]} />
        </div>
        <div className='col-span-4'>
          <AreaGraph data={[]} />
        </div>
        <div className='col-span-4 md:col-span-3'>
          <PieGraph data={[]} />
        </div>
      </div>
    </PageContainer>
  );
}
