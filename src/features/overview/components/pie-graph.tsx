'use client';

import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

type PieDataPoint = {
  status: string;
  count: number;
  fill: string;
};

const chartConfig = {
  count: {
    label: 'Creators'
  },
  discovered: {
    label: 'Discovered',
    color: 'var(--chart-1)'
  },
  contacted: {
    label: 'Contacted',
    color: 'var(--chart-2)'
  },
  replied: {
    label: 'Replied',
    color: 'var(--chart-3)'
  },
  negotiating: {
    label: 'Negotiating',
    color: 'var(--chart-4)'
  },
  onboarded: {
    label: 'Onboarded',
    color: 'var(--chart-3)'
  },
  active: {
    label: 'Active',
    color: 'var(--chart-4)'
  }
} satisfies ChartConfig;

export function PieGraph({ data }: { data: PieDataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (data.length === 0) {
    return (
      <Card className='flex h-full flex-col'>
        <CardHeader className='items-center pb-0'>
          <CardTitle>Creators by Status</CardTitle>
          <CardDescription>Pipeline breakdown</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-1 items-center justify-center pb-0'>
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-muted-foreground text-sm'>No status data yet</p>
            <p className='text-muted-foreground mt-1 text-xs'>Run discovery to populate.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          Creators by Status
          <Badge variant='outline'>
            <Icons.trendingUp />
            {total} total
          </Badge>
        </CardTitle>
        <CardDescription>Pipeline breakdown</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='count' hideLabel />} />
            <Pie
              data={data}
              innerRadius={30}
              dataKey='count'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='count'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value: number) => value.toString()}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
