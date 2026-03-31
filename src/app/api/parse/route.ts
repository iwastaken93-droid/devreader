import { NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Security: Validate URLs to prevent SSRF
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow HTTP/HTTPS
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname;

    // Block common internal/local hostnames
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Basic IP validation (doesn't catch all edge cases like octal, but covers typical SSRF strings)
    // For a more robust check in a real environment, you'd resolve the hostname to an IP and check it.
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);

      // 10.0.0.0/8
      if (octet1 === 10) return false;
      // 172.16.0.0/12
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      // 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) return false;
      // 169.254.0.0/16 (AWS metadata, etc)
      if (octet1 === 169 && octet2 === 254) return false;
      // 127.0.0.0/8
      if (octet1 === 127) return false;
      // 0.0.0.0/8
      if (octet1 === 0) return false;
    }

    return true;
  } catch {
    return false; // Invalid URL string
  }
}

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

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid or unsafe URL provided' }, { status: 400 });
    }

    let markdown = '';
    let title = '';
    const toc: { id: string, text: string, level: number }[] = [];
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
        if (!isValidUrl(rawUrl)) {
          return NextResponse.json({ error: 'Invalid or unsafe URL provided for GitHub fetch' }, { status: 400 });
        }
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
        const headingMatches = markdown.matchAll(/^(#{1,3})\s+(.+)$/gm);
        for (const match of headingMatches) {
          const text = match[2].trim();
          const level = match[1].length;
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
    } catch (dbError: unknown) {
      console.error('Database Error:', dbError);
      return NextResponse.json({ 
        error: 'Database error. Did you run prisma db push?',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    return NextResponse.json({ 
        article: savedArticle,
        markdown,
        title,
        saved: savedArticle.saved,
        toc
    });

  } catch (error: unknown) {
    console.error('General Parsing Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process URL',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
