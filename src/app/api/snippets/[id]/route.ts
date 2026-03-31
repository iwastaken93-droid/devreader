import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    
    const snippet = await prisma.snippet.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!snippet) {
      return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
    }

    if (snippet.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.snippet.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ message: 'Snippet deleted' });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    return NextResponse.json({ error: 'Failed to delete snippet' }, { status: 500 });
  }
}
