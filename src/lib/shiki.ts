import { createHighlighter } from 'shiki'

let highlighter: any = null

export async function highlight(code: string, lang: string = 'javascript', theme: string = 'github-dark') {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light', 'dracula', 'monokai'],
      langs: ['javascript', 'typescript', 'python', 'rust', 'go', 'html', 'css', 'json', 'markdown', 'bash', 'yaml', 'sql']
    })
  }
  
  try {
    return highlighter.codeToHtml(code, { lang, theme })
  } catch (e) {
    return code; // Fallback to raw code if highlighting fails
  }
}
