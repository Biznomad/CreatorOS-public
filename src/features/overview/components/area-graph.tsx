'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import React from 'react';

type AreaDataPoint = {
  month: string;
  creators: number;
};

const chartConfig = {
  creators: {
    label: 'Total Creators',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function AreaGraph({ data }: { data: AreaDataPoint[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Pipeline Growth</CardTitle>
          <CardDescription>Cumulative creators discovered over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-muted-foreground text-sm'>No growth data yet</p>
            <p className='text-muted-foreground mt-1 text-xs'>Run discovery to populate.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data[data.length - 1]?.creators ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Creator Pipeline Growth
          {total > 0 && (
            <Badge variant='outline'>
              <Icons.trendingUp />
              {total} total
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Cumulative creators discovered over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <DottedBackgroundPattern config={chartConfig} />
            </defs>
            <Area
              dataKey='creators'
              type='natural'
              fill='url(#dotted-background-pattern-creators)'
              fillOpacity={0.4}
              stroke='var(--color-creators)'
              stackId='a'
              strokeWidth={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <pattern
          key={key}
          id={`dotted-background-pattern-${key}`}
          x='0'
          y='0'
          width='7'
          height='7'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='5' cy='5' r='1.5' fill={value} opacity={0.5}></circle>
        </pattern>
      ))}
    </>
  );
};
