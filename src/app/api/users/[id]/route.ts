import { NextResponse } from 'next/server';

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Legacy users API retired',
      detail: 'User roles and membership are managed by Clerk organizations.'
    },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Legacy users API retired',
      detail: 'Remove organization members through Clerk organization membership controls.'
    },
    { status: 410 }
  );
}
