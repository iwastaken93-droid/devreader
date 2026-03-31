import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { summarizeArticle } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const summary = await summarizeArticle(content);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Summarize Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
