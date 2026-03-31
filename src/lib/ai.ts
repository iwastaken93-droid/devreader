import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function summarizeArticle(content: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  const prompt = `Summarize the following technical article in 3-5 bullet points. Focus on the key technical takeaways and architectural decisions: \n\n${content.substring(0, 10000)}`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function explainCode(code: string, context?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  const prompt = `Explain this code snippet clearly for a developer. ${context ? `Context: This code is from ${context}` : ''} \n\nCode:\n\`\`\`\n${code}\n\`\`\``;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
