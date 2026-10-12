import { redirect } from 'next/navigation';

// Auth removed — redirect directly to dashboard
export default function SignUpViewPage() {
  redirect('/dashboard/overview');
}
