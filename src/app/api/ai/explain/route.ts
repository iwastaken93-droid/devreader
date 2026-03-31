import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { explainCode } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, context } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const explanation = await explainCode(code, context);
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error('Explain Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
