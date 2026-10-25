# 2. The page address owns the Search

## Status

Accepted

## Context

The original app kept the Search in a form object, copied it into the URL with `history.replaceState`, re-read it on `popstate`, kept a second copy as `orig_search_param`, and decided when to reload by comparing the two. Three copies of one piece of state, written from several places.

React Router or TanStack Router would add a dependency to manage what is a single page with three query parameters.

## Decision

The page address is the single owner of the Search. `useSearch()` reads it with `useSyncExternalStore` over the History API and exposes one way to change it: `navigate(search, mode)`, which pushes a history entry, or replaces the current one when a Nearby search follows the device (so back skips the small steps). `back()` is history navigation, not a second writer: it goes back when the previous entry is this app and otherwise navigates to the start. The form, the result list and the tree detail all derive from that value. No router library.

## Consequences

- Back/forward, reload and shared links restore the exact Search for free.
- There is one writer of the Search, so the copies can't drift.
- If the app ever grows real pages, a router replaces `useSearch()` behind the same interface.
