## 2025-03-31 - [SSRF in Parse API]
**Vulnerability:** The `/api/parse` endpoint takes a user-supplied URL and directly calls `fetch(url)` without validating whether the URL is safe, exposing the application to Server-Side Request Forgery (SSRF) attacks against internal resources.
**Learning:** Next.js API routes that proxy or fetch external content based on user input must strictly validate URLs to prevent SSRF and disallow protocols like `file://` or access to internal network IPs (`localhost`, `10.x.x.x`, etc.).
**Prevention:** Always validate URLs to ensure `http:` or `https:` protocol and block resolution to internal IP addresses or hostnames before calling `fetch` with user-supplied data.
