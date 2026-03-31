import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, language, sourceUrl, articleId } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code snippet is required' }, { status: 400 });
    }

    const snippet = await prisma.snippet.create({
      data: {
        code,
        language,
        sourceUrl,
        articleId,
        userId: user.id,
      }
    });

    return NextResponse.json(snippet);
  } catch (error) {
    console.error('Error saving snippet:', error);
    return NextResponse.json({ error: 'Failed to save snippet' }, { status: 500 });
  }
}
