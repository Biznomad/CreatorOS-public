import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Legacy product API retired',
      detail: 'Use the active brand Shopify catalog endpoint instead.'
    },
    { status: 410 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Legacy product API retired',
      detail: 'Product edits belong in Shopify; CreatorOS reads products for gifting and activation workflows.'
    },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Legacy product API retired',
      detail: 'Product deletion is not handled by CreatorOS.'
    },
    { status: 410 }
  );
}
