'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useBrandStore } from '@/components/org-switcher';

const STEPS = [
  {
    title: 'Welcome to CreatorOS',
    description:
      "The operating system for influencer whitelisting. Let's get you set up in under 2 minutes.",
    icon: 'sparkles' as const
  },
  {
    title: 'Connect Your Shopify Store',
    description:
      "Import your customers automatically. We'll scan for creators hiding in your customer base \u2014 most brands find 200\u2013500 potential nano/micro influencers.",
    icon: 'product' as const
  },
  {
    title: 'Configure Your Brand',
    description:
      'Set your niche, target audience, and scoring criteria. The AI uses this to rank every creator on relevance, engagement, and brand fit.',
    icon: 'settings' as const
  },
  {
    title: 'Discover & Activate',
    description:
      'Search Instagram and TikTok by hashtag, enrich profiles with follower data, and start sending AI-generated outreach proposals.',
    icon: 'search' as const
  }
];

type StepIcon = (typeof STEPS)[number]['icon'];

const ONBOARDING_COMPLETE_KEY_PREFIX = 'creatoros-onboarding-complete';

function isLocalQaAuthEnabled() {
  if (typeof window === 'undefined') return false;
  const isLocalHost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalHost) return false;
  if (
    process.env.NEXT_PUBLIC_CREATOROS_QA_AUTH_BYPASS === 'true' ||
    window.location.search.includes('qa=1')
  ) {
    return true;
  }
  try {
    return window.localStorage.getItem('creatoros:qa-auth') === 'true';
  } catch {
    return false;
  }
}

function getOnboardingCompleteKey(userId?: string | null, email?: string | null) {
  const identity = userId || email?.trim().toLowerCase() || 'anonymous';
  return `${ONBOARDING_COMPLETE_KEY_PREFIX}:${identity}`;
}

export function OnboardingModal() {
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const activeBrandId = useBrandStore((s) => s.activeBrand.id);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const qaEmail = process.env.NEXT_PUBLIC_CREATOROS_QA_USER_EMAIL;
  const onboardingCompleteKey = useMemo(
    () => getOnboardingCompleteKey(user?.id, user?.primaryEmailAddress?.emailAddress || qaEmail),
    [qaEmail, user?.id, user?.primaryEmailAddress?.emailAddress]
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (isLocalQaAuthEnabled()) {
      localStorage.setItem(onboardingCompleteKey, 'true');
      setOpen(false);
      return;
    }
    const seen = localStorage.getItem(onboardingCompleteKey);
    if (!seen) setOpen(true);
  }, [isLoaded, onboardingCompleteKey]);

  function handleComplete(nextRoute?: string) {
    localStorage.setItem(onboardingCompleteKey, 'true');
    setOpen(false);
    if (nextRoute) router.push(nextRoute);
  }

  const current = STEPS[step];
  const IconComponent = current ? Icons[current.icon as StepIcon] : null;
  const setupRoute = activeBrandId ? '/dashboard/integrations' : '/dashboard/workspaces';
  const setupLabel = activeBrandId ? 'Connect integrations' : 'Create workspace';

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
          return;
        }
        handleComplete();
      }}
    >
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-indigo-500/10'>
            {IconComponent && <IconComponent className='size-6 text-indigo-600' />}
          </div>
          <DialogTitle className='text-center'>{current?.title}</DialogTitle>
        </DialogHeader>
        <p className='text-center text-sm leading-relaxed text-muted-foreground'>
          {current?.description}
        </p>
        <div className='flex justify-center gap-1.5 py-2'>
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i <= step ? 'bg-indigo-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <DialogFooter className='flex-row justify-between sm:justify-between'>
          {step > 0 ? (
            <Button variant='outline' onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button variant='ghost' onClick={() => handleComplete()}>
              Skip
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={() => handleComplete(setupRoute)}>{setupLabel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
