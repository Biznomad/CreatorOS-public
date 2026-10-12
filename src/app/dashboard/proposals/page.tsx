import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard: AI Proposals'
};

export default function Page() {
  redirect('/dashboard/briefs');
}
