import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

type CreatorData = {
  name: string;
  handle: string;
  platform: string;
  avatar: string;
  fallback: string;
  roas: string;
};

export function RecentSales({ creators }: { creators: CreatorData[] }) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Top Creators</CardTitle>
        <CardDescription>Your highest-scoring creators in the pipeline.</CardDescription>
      </CardHeader>
      <CardContent>
        {creators.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-muted-foreground text-sm'>No creators yet</p>
            <p className='text-muted-foreground mt-1 text-xs'>Run discovery to populate.</p>
          </div>
        ) : (
          <div className='space-y-8'>
            {creators.map((creator, index) => (
              <div key={index} className='flex items-center'>
                <Avatar className='h-9 w-9'>
                  <AvatarImage src={creator.avatar} alt='Avatar' />
                  <AvatarFallback>{creator.fallback}</AvatarFallback>
                </Avatar>
                <div className='ml-4 space-y-1'>
                  <p className='text-sm leading-none font-medium'>{creator.name}</p>
                  <p className='text-muted-foreground text-sm'>
                    {creator.handle} · {creator.platform}
                  </p>
                </div>
                <div className='ml-auto font-medium text-sm'>{creator.roas}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
