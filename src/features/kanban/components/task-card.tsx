'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { KanbanItem, KanbanItemHandle } from '@/components/ui/kanban';
import type { CreatorCard } from '../utils/store';
import { CreatorDetailDialog } from './creator-detail-dialog';

interface TaskCardProps extends Omit<React.ComponentProps<typeof KanbanItem>, 'value'> {
  task: CreatorCard;
}

function hasUsefulNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function formatFollowers(count?: number): string {
  if (!hasUsefulNumber(count)) return 'Followers unavailable';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M followers`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K followers`;
  return `${count} followers`;
}

function formatScore(score?: number): string {
  return hasUsefulNumber(score) ? `Score ${score}` : 'Score unavailable';
}

function formatMoney(value?: number): string {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function isGeneratedAvatar(url?: string) {
  return !url || url.includes('dicebear.com') || url.includes('ui-avatars.com');
}

function getPhotoStatus(task: CreatorCard, photoLoadFailed: boolean) {
  if (photoLoadFailed) return 'Photo unavailable';
  if (!isGeneratedAvatar(task.avatar_url)) return null;
  const source = typeof task.meta?.profile_photo_source === 'string' ? task.meta.profile_photo_source : '';
  if (source === 'meta_business_discovery_unavailable') return 'Fallback avatar';
  return 'Photo queued';
}

function getPlatformLabel(platform: CreatorCard['platform']) {
  if (platform === 'tiktok') return 'TT';
  if (platform === 'email') return 'Email';
  return 'IG';
}

export function TaskCard({ task, ...props }: TaskCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const customerOrders = Number(task.order_count || task.shopify?.order_count || 0);
  const customerSpend = Number(task.total_spent || task.shopify?.total_spent || 0);
  const isCustomer = Boolean(task.is_shopify_customer || customerOrders || customerSpend);
  const photoStatus = getPhotoStatus(task, photoLoadFailed);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [task.avatar_url]);

  return (
    <>
      <KanbanItem
        key={task.id}
        value={task.id}
        onClick={() => setDialogOpen(true)}
        className='bg-card w-full rounded-md border p-3 text-left shadow-xs cursor-pointer hover:bg-accent/50 transition-colors'
        {...props}
      >
        <div>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2 min-w-0'>
                <Avatar className='size-7 bg-muted'>
                  <AvatarImage
                    src={task.avatar_url}
                    alt={task.display_name}
                    onLoadingStatusChange={(status) => setPhotoLoadFailed(status === 'error')}
                  />
                  <AvatarFallback className='text-[10px]'>
                    {(task.display_name || task.handle).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold leading-tight truncate'>{task.display_name}</p>
                  <p className='text-muted-foreground text-[11px] truncate'>@{task.handle}</p>
                </div>
              </div>
              <Badge
                variant={task.platform === 'instagram' ? 'default' : 'secondary'}
                className='pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-[10px] capitalize'
              >
                {getPlatformLabel(task.platform)}
              </Badge>
              <KanbanItemHandle
                aria-label='Drag creator card'
                className='-mr-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground'
                onClick={(event) => event.stopPropagation()}
              >
                <Icons.gripVertical className='size-3.5' />
              </KanbanItemHandle>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {isCustomer ? (
                <Badge className='pointer-events-none h-5 rounded-sm border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700'>
                  Customer · {customerOrders} orders · {formatMoney(customerSpend)}
                </Badge>
              ) : (
                <Badge variant='outline' className='pointer-events-none h-5 rounded-sm px-1.5 text-[10px]'>
                  Prospect
                </Badge>
              )}
              {photoStatus && (
                <Badge variant='outline' className='pointer-events-none h-5 rounded-sm px-1.5 text-[10px]'>
                  {photoStatus}
                </Badge>
              )}
            </div>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>
                {formatFollowers(task.follower_count)}
              </span>
              <Badge
                variant='outline'
                className='pointer-events-none h-5 rounded-sm px-1.5 text-[10px] font-semibold'
              >
                {formatScore(task.score)}
              </Badge>
            </div>
          </div>
        </div>
      </KanbanItem>
      <CreatorDetailDialog
        creator={task}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
