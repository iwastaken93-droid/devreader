import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let markdown = '';
    let title = '';
    let toc: { id: string, text: string, level: number }[] = [];
    const domain = new URL(url).hostname;

    // Special handling for GitHub
    if (domain === 'github.com') {
      let rawUrl = '';
      
      // Handle blob links (e.g., github.com/user/repo/blob/main/README.md)
      if (url.includes('/blob/')) {
        rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      } 
      // Handle repo root (default to README)
      else {
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const [, owner, repo] = match;
          rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        }
      }

      if (rawUrl) {
        const apiResponse = await fetch(rawUrl);
        if (apiResponse.ok) {
          markdown = await apiResponse.text();
          title = url.split('/').pop() || 'GitHub File';
        }
      }
    }

    // Default processing for general articles
    if (!markdown) {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
        markdown = await response.text();
        title = url.split('/').pop() || 'Raw Content';
      } else {
        const html = await response.text();
        const { document } = parseHTML(html);
        const reader = new Readability(document);
        const article = reader.parse();

        if (!article) {
          // If readability fails, fallback to raw text if it looks like markdown
          if (html.includes('#') || html.includes('```')) {
            markdown = html;
            title = 'Parsed Content';
          } else {
            return NextResponse.json({ error: 'Failed to parse article' }, { status: 500 });
          }
        } else {
          title = article.title || "";
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
          });
          markdown = turndownService.turndown(article.content || "");
        }
      }

      // Generate TOC for any markdown we got
      if (markdown && toc.length === 0) {
        // Simple regex-based TOC for raw markdown
        const headingMatches = markdown.matchAll(/^#{1,3}\s+(.+)$/gm);
        for (const match of headingMatches) {
          const text = match[1].trim();
          const level = match[0].trim().split(' ')[0].length;
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          toc.push({ id, text, level });
        }
      }
    }

    // Check if article already exists for user
    let savedArticle;
    try {
      savedArticle = await prisma.article.findUnique({
        where: { url }
      });

      if (!savedArticle) {
        savedArticle = await prisma.article.create({
            data: {
                title: title || 'Untitled',
                url,
                domain,
                content: markdown,
                userId: user.id
            }
        });
      }
    } catch (dbError: any) {
      console.error('Database Error:', dbError);
      return NextResponse.json({ 
        error: 'Database error. Did you run prisma db push?',
        details: dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
        article: savedArticle,
        markdown,
        title,
        saved: savedArticle.saved,
        toc
    });

  } catch (error: any) {
    console.error('General Parsing Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process URL',
      details: error.message 
    }, { status: 500 });
  }
}
