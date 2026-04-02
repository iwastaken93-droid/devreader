import { createHighlighter } from 'shiki'

let highlighter: any = null

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function highlight(code: string, lang: string = 'javascript', theme: string = 'github-dark') {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light', 'dracula', 'monokai'],
      langs: ['javascript', 'typescript', 'python', 'rust', 'go', 'html', 'css', 'json', 'markdown', 'bash', 'yaml', 'sql']
    })
  }
  
  try {
    return highlighter.codeToHtml(code, { lang, theme })
  } catch (_e) {
    return `<pre><code>${escapeHtml(code)}</code></pre>`; // Fallback to escaped raw code if highlighting fails
  }
}
