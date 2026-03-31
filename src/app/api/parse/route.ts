import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
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

      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
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
    }

    // Check if article already exists for user
    let savedArticle = await prisma.article.findUnique({
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

    return NextResponse.json({ 
        article: savedArticle,
        markdown,
        title
    });

  } catch (error) {
    console.error('Error parsing URL:', error);
    return NextResponse.json({ error: 'Failed to process URL' }, { status: 500 });
  }
}
