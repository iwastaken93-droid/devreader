import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const collectionId = searchParams.get('collectionId');

    const whereClause: any = { userId: user.id };

    if (search) {
      whereClause.code = { contains: search, mode: 'insensitive' };
    }

    if (collectionId && collectionId !== 'all') {
      whereClause.collectionId = collectionId;
    }

    const snippets = await prisma.snippet.findMany({
      where: whereClause,
      include: {
        article: {
          select: { title: true }
        },
        collection: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(snippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 });
  }
}
