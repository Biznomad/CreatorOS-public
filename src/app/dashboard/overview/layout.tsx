'use client';

import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import React from 'react';
import { StatsProvider, useStats } from './stats-context';

type Stats = {
  totalCreators: number;
  activeCampaigns: number;
  blendedRoas: string;
  totalSpend: string;
};

type StatsApiData = {
  pipeline?: {
    total?: number;
  };
  campaigns?: {
    active_count?: number;
    blended_roas?: number | string;
    total_spend?: number | string;
  };
};

function parseStats(data: StatsApiData | null): Stats {
  if (!data) {
    return {
      totalCreators: 0,
      activeCampaigns: 0,
      blendedRoas: '0.0x',
      totalSpend: '$0'
    };
  }
  return {
    totalCreators: data.pipeline?.total ?? 0,
    activeCampaigns: data.campaigns?.active_count ?? 0,
    blendedRoas: data.campaigns?.blended_roas
      ? `${Number(data.campaigns.blended_roas).toFixed(1)}x`
      : '0.0x',
    totalSpend: data.campaigns?.total_spend
      ? `$${(Number(data.campaigns.total_spend) / 1000).toFixed(1)}K`
      : '$0'
  };
}

export default function OverViewLayout({
  sales,
  pie_stats,
  bar_stats,
  area_stats
}: {
  sales: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <StatsProvider>
      <OverviewContent
        sales={sales}
        pie_stats={pie_stats}
        bar_stats={bar_stats}
        area_stats={area_stats}
      />
    </StatsProvider>
  );
}

function OverviewContent({
  sales,
  pie_stats,
  bar_stats,
  area_stats
}: {
  sales: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  const { data } = useStats();
  const stats = parseStats(data);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>CreatorOS Overview</h1>
            <p className='text-muted-foreground text-sm'>
              Influencer pipeline, campaign performance, and whitelisted ad ROAS at a glance.
            </p>
          </div>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Total Creators</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.totalCreators.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.teams />
                  Pipeline
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Discovered creators <Icons.teams className='size-4' />
              </div>
              <div className='text-muted-foreground'>Real-time count from API</div>
            </CardFooter>
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Active Campaigns</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.activeCampaigns}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.trendingUp />
                  Live
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Running campaigns <Icons.trendingUp className='size-4' />
              </div>
              <div className='text-muted-foreground'>Whitelisted + brand ads</div>
            </CardFooter>
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Blended ROAS</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.blendedRoas}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.sparkles />
                  Performance
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Return on ad spend <Icons.sparkles className='size-4' />
              </div>
              <div className='text-muted-foreground'>Across all campaigns</div>
            </CardFooter>
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Total Spend</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {stats.totalSpend}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <Icons.creditCard />
                  Budget
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                Total ad investment <Icons.creditCard className='size-4' />
              </div>
              <div className='text-muted-foreground'>All-time campaign spend</div>
            </CardFooter>
          </Card>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>{bar_stats}</div>
          <div className='col-span-4 md:col-span-3'>
            {sales}
          </div>
          <div className='col-span-4'>{area_stats}</div>
          <div className='col-span-4 min-h-0 md:col-span-3'>{pie_stats}</div>
        </div>
      </div>
    </PageContainer>
  );
}
