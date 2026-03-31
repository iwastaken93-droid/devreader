import { NextResponse } from 'next/server';
import { highlight } from '@/lib/shiki';

export async function POST(req: Request) {
  try {
    const { code, lang, theme } = await req.json();
    const html = await highlight(code, lang, theme);
    return NextResponse.json({ html });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
