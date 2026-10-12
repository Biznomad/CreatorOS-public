import { PublicApplicationPage } from '@/features/applications/components/public-application-page';

const knownBrandNames: Record<string, string> = {
  'demo-brand': 'Demo Brand'
};

function brandNameFromId(brandId: string) {
  const normalized = decodeURIComponent(brandId).trim().toLowerCase();
  if (knownBrandNames[normalized]) return knownBrandNames[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brandName = brandNameFromId(brandId);
  return {
    title: `${brandName} Creator Application`,
    description: `Apply to join the ${brandName} CreatorOS-powered creator partnership program.`
  };
}

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  return <PublicApplicationPage brandId={decodeURIComponent(brandId)} />;
}
