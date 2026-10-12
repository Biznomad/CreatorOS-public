import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard: Messages'
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  const resolvedSearchParams = await searchParams;

  for (const [key, value] of Object.entries(resolvedSearchParams || {})) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(`/dashboard/outreach${query ? `?${query}` : ''}`);
}
