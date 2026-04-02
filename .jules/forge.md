# Forge Learning Log

## The Command Palette Evolution
- **Why**: The existing Cmd+K palette was static and only handled basic routing and theme toggling. It failed to serve as the true navigation hub for user data (snippets, articles, collections).
- **Pattern Adopted**: Dynamic global search integration directly into the command palette. We adopted a debounced API query pattern that aggregates results from multiple Prisma models (`Article`, `Snippet`, `Collection`) into a unified interface, drastically reducing time-to-navigate for users.
- **Accessibility**: Implemented full `aria-activedescendant` and `role="listbox"` patterns to ensure the complex multi-section palette remains fully navigable via keyboard and screen readers, as basic `map` logic was too rigid.
- **Scalability**: By moving search logic to a dedicated `/api/search` endpoint instead of relying on frontend state, the app can handle an arbitrary number of saved items without bloating client memory.
