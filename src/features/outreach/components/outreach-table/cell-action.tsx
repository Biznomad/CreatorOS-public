'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { updateOutreachStatus } from '../../api/service';
import { outreachKeys } from '../../api/queries';
import type { OutreachMessage } from '../../api/types';
import { Icons } from '@/components/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBrandStore } from '@/components/org-switcher';

interface CellActionProps {
  data: OutreachMessage;
}

export function CellAction({ data }: CellActionProps) {
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const queryClient = useQueryClient();
  const brandId = data.brand_id || activeBrandId;
  const [pendingOutreachStatus, setPendingOutreachStatus] = useState<OutreachMessage['status'] | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: OutreachMessage['status'] }) =>
      updateOutreachStatus(id, status, brandId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.all });
      toast.success(`Marked as ${variables.status}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    },
    onSettled: () => {
      setPendingOutreachStatus(null);
    }
  });

  function handleCopyMessage() {
    navigator.clipboard.writeText(data.message).then(() => {
      toast.success('Message copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy message');
    });
  }

  function requestMarkStatus(status: OutreachMessage['status']) {
    if (!brandId) {
      toast.error('Select a client workspace before updating outreach.');
      return;
    }
    setPendingOutreachStatus(status);
  }

  function handleMarkStatus(status: OutreachMessage['status']) {
    statusMutation.mutate({ id: data.id, status });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0'
            aria-label={`Open outreach actions for ${data.creator_handle || data.creator_display_name || data.id}`}
            disabled={statusMutation.isPending}
          >
            <span className='sr-only'>Open menu</span>
            {statusMutation.isPending ? <Icons.spinner className='h-4 w-4 animate-spin' /> : <Icons.ellipsis className='h-4 w-4' />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCopyMessage}>
            <Icons.paperclip className='mr-2 h-4 w-4' /> Copy Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => requestMarkStatus('sent')}
            disabled={statusMutation.isPending || data.status === 'sent' || !brandId}
          >
            <Icons.send className='mr-2 h-4 w-4' /> Mark Sent
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => requestMarkStatus('replied')}
            disabled={statusMutation.isPending || data.status === 'replied' || !brandId}
          >
            <Icons.chat className='mr-2 h-4 w-4' /> Mark Replied
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => requestMarkStatus('declined')}
            disabled={statusMutation.isPending || data.status === 'declined' || !brandId}
            className='text-destructive focus:text-destructive'
          >
            <Icons.circleX className='mr-2 h-4 w-4' /> Mark Declined
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={Boolean(pendingOutreachStatus)} onOpenChange={(open) => !open && setPendingOutreachStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update outreach status?</AlertDialogTitle>
            <AlertDialogDescription>
              CreatorOS will mark @{data.creator_handle || data.creator_display_name || data.id} as {pendingOutreachStatus || 'updated'}. This changes the outreach pipeline state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              onClick={() => {
                if (pendingOutreachStatus) handleMarkStatus(pendingOutreachStatus);
              }}
            >
              Update status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
