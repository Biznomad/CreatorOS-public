import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Legacy product API retired',
      detail: 'Use /api/proxy/api/brands/{brand_id}/shopify/products for the Shopify-backed CreatorOS catalog.'
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy product API retired',
      detail: 'Products are managed in Shopify and read through the brand Shopify catalog endpoint.'
    },
    { status: 410 }
  );
}
