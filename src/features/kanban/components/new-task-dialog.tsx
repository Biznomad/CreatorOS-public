'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useTaskStore } from '../utils/store';
import type { Platform } from '../utils/store';
import { toast } from 'sonner';

export default function NewTaskDialog() {
  const addTask = useTaskStore((state) => state.addTask);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const { handle, display_name, niche, platform } = Object.fromEntries(formData);

    if (
      typeof handle !== 'string' ||
      typeof display_name !== 'string' ||
      typeof niche !== 'string' ||
      typeof platform !== 'string'
    ) return;

    if (!handle.trim() || !display_name.trim()) return;

    setSaving(true);
    try {
      await addTask(handle.trim().replace(/^@/, ''), platform as Platform, display_name.trim(), niche.trim());
      toast.success(`@${handle.trim().replace(/^@/, '')} was added to the pipeline.`);
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save creator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='secondary' size='sm' className='min-h-11'>
          + Add Creator
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add Creator</DialogTitle>
          <DialogDescription>Add a new creator to your discovery pipeline.</DialogDescription>
        </DialogHeader>
        <form id='creator-form' className='grid gap-4 py-4' onSubmit={handleSubmit}>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Input
              id='handle'
              name='handle'
              placeholder='@handle'
              aria-label='Creator handle'
              className='col-span-4'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Input
              id='display_name'
              name='display_name'
              placeholder='Display name'
              aria-label='Creator display name'
              className='col-span-4'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Select name='platform' defaultValue='instagram'>
              <SelectTrigger className='col-span-4' aria-label='Creator platform'>
                <SelectValue placeholder='Platform' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='instagram'>Instagram</SelectItem>
                <SelectItem value='tiktok'>TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Input
              id='niche'
              name='niche'
              placeholder='Niche (e.g. gut health)'
              aria-label='Creator niche'
              className='col-span-4'
            />
          </div>
        </form>
        <DialogFooter>
          <Button type='submit' size='sm' form='creator-form' isLoading={saving}>
            Add Creator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
