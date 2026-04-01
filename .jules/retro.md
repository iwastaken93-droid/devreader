# Retro Chronicles

- We use a pattern here that React 19 actually discourages because full-page spinners lead to "Loading Spinner Hell". Moved away from a single `Loader2` replacing the entire UI during tab switching and search, and implemented cohesive `SkeletonSnippetCard` and `SkeletonArticleCard` components using Tailwind's `animate-pulse` to create a shimmer effect for the library cards, significantly improving perceived performance.
- Discovered "Click Lag" during deletions in the library. Implemented Optimistic UI for `deleteSnippet` and `deleteArticle` so the cards instantly vanish on click, providing immediate feedback, falling back only if the API call fails.
