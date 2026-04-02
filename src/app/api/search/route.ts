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
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json({ articles: [], snippets: [], collections: [] });
    }

    const searchTerm = query.trim();

    // Run searches in parallel
    const [articles, snippets, collections] = await Promise.all([
      prisma.article.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            // Don't search massive content here to keep it fast, but maybe domain
            { domain: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          url: true,
          domain: true,
          updatedAt: true,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.snippet.findMany({
        where: {
          userId: user.id,
          OR: [
            { language: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { contains: searchTerm, mode: 'insensitive' } },
            // Search snippet code if it contains the term
            { code: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          language: true,
          code: true, // we will truncate code on the client or here
          updatedAt: true,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      prisma.collection.findMany({
        where: {
          userId: user.id,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
        take: 3,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Truncate snippet code before sending
    const processedSnippets = snippets.map(snippet => ({
      ...snippet,
      code: snippet.code.length > 100 ? snippet.code.substring(0, 100) + '...' : snippet.code
    }));

    return NextResponse.json({
      articles,
      snippets: processedSnippets,
      collections,
    });
  } catch (error: unknown) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
