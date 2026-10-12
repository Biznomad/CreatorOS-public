import PublicSupportWidget from '@/features/support/components/public-support-widget';

const knownBrandNames: Record<string, string> = {
  'demo-brand': 'Demo Brand'
};

function brandNameFromId(brandId: string) {
  const normalized = brandId.trim().toLowerCase();
  if (knownBrandNames[normalized]) return knownBrandNames[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  return {
    title: `${brandNameFromId(decodeURIComponent(brandId))} Support`,
    robots: {
      index: false,
      follow: false
    }
  };
}

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  return <PublicSupportWidget brandId={decodeURIComponent(brandId)} />;
}
