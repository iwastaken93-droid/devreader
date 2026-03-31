import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, saved } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    const updatedArticle = await prisma.article.update({
      where: { 
        id,
        userId: user.id 
      },
      data: {
        saved: saved
      }
    });

    return NextResponse.json(updatedArticle);
  } catch (error: any) {
    console.error('Error saving article:', error);
    return NextResponse.json({ error: 'Failed to save article', details: error.message }, { status: 500 });
  }
}
