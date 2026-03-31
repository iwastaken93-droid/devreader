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
    const domain = new URL(url).hostname;

    // Special handling for GitHub READMEs
    if (domain === 'github.com') {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const apiResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers: {
            'Accept': 'application/vnd.github.v3.raw',
            ...(process.env.GITHUB_SECRET ? { 'Authorization': `Bearer ${process.env.GITHUB_SECRET}` } : {})
          }
        });
        
        if (apiResponse.ok) {
          markdown = await apiResponse.text();
          title = `${owner}/${repo} README`;
        }
      }
    }

    // Default processing for general articles
    if (!markdown) {
      const response = await fetch(url);
      const html = await response.text();

      const { document } = parseHTML(html);
      const reader = new Readability(document);
      const article = reader.parse();

      if (!article) {
        return NextResponse.json({ error: 'Failed to parse article' }, { status: 500 });
      }

      title = article.title || "";
      
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });
      
      markdown = turndownService.turndown(article.content || "");

      // Generate TOC
      const toc: { id: string, text: string, level: number }[] = [];
      const headings = document.querySelectorAll('h1, h2, h3');
      headings.forEach((heading: any, index: number) => {
        const text = heading.textContent?.trim() || '';
        const id = text.toLowerCase().replace(/[^\w]+/g, '-') + '-' + index;
        heading.setAttribute('id', id);
        toc.push({
          id,
          text,
          level: parseInt(heading.tagName[1])
        });
      });
      
      // Update markdown if we modified the document (to include IDs)
      if (toc.length > 0) {
        markdown = turndownService.turndown(document.body.innerHTML);
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
