import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const collectionId = searchParams.get('collectionId');

    // Optimization: Use raw SQL with SUBSTRING to avoid fetching the entire content text into memory
    // Prisma's `select` doesn't natively support SQL functions like SUBSTRING.
    const searchCondition = search
      ? Prisma.sql`AND (a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'})`
      : Prisma.empty;

    const collectionCondition = (collectionId && collectionId !== 'all')
      ? Prisma.sql`AND a."collectionId" = ${collectionId}`
      : Prisma.empty;

    const articles = await prisma.$queryRaw`
      SELECT
        a.id,
        a.title,
        SUBSTRING(a.content, 1, 150) as content,
        a.domain,
        a.url,
        a.saved,
        a."userId",
        a."collectionId",
        a."createdAt",
        a."updatedAt",
        CASE
          WHEN c.id IS NOT NULL THEN json_build_object('name', c.name)
          ELSE NULL
        END as collection
      FROM "Article" a
      LEFT JOIN "Collection" c ON a."collectionId" = c.id
      WHERE a."userId" = ${user.id}
        AND a.saved = true
        ${collectionCondition}
        ${searchCondition}
      ORDER BY a."updatedAt" DESC
    `;

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
