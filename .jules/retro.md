# Retro Chronicles

- We use a pattern here that React 19 actually discourages because full-page spinners lead to "Loading Spinner Hell". Moved away from a single `Loader2` replacing the entire UI during tab switching and search, and implemented cohesive `SkeletonSnippetCard` and `SkeletonArticleCard` components using Tailwind's `animate-pulse` to create a shimmer effect for the library cards, significantly improving perceived performance.
- Discovered "Click Lag" during deletions in the library. Implemented Optimistic UI for `deleteSnippet` and `deleteArticle` so the cards instantly vanish on click, providing immediate feedback, falling back only if the API call fails.
- Replaced clunky inline text errors (`<p className="text-[var(--error)]...">{error}</p>`) with a branded "Recovery Path" Error State component in the Sublime Console parsing flow.
- Introduced Optimistic UI to the article saving and collection assignment flows, eliminating the jarring loading states, and added a custom, sleek Floating Toast Notification system for global feedback across `src/app/page.tsx` instead of silent failures.
