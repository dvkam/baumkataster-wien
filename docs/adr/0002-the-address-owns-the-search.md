# 2. The URL defines the search

## Status

Accepted. Updated for TanStack Router on 26 October 2026.

## Decision

TanStack Router manages navigation and browser history. The domain parser validates the URL search parameters. `useSearch()` exposes the same typed `navigate(search, mode)` interface to components.

Search criteria stay in query parameters at the site root. Existing links remain valid and GitHub Pages needs no fallback route. The router base path supports the repository subdirectory.

The map, list and detail view derive their state from the URL. Device movement replaces the current history entry. A deliberate search or tree selection pushes a new entry.

TanStack Query manages responses separately from navigation. Tree queries use the canonical search parameters as their cache key, consume the cancellation signal and remain fresh for one minute. Inactive queries expire after 10 minutes.
