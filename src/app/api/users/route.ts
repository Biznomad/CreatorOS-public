import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Legacy users API retired',
      detail: 'Use Clerk organization membership controls from /dashboard/users or /dashboard/workspaces/team.'
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy users API retired',
      detail: 'Invite and manage users through Clerk organization membership controls.'
    },
    { status: 410 }
  );
}
