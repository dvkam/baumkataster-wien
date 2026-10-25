# Verification notes

Review date: 26 October 2026, Europe/Vienna.

The supplied app already used the current React, TypeScript, Vite, Oxlint and Oxfmt versions. The implementation keeps those versions and adds geographic bounds checks, an optional live WFS test, named-place searches, static-hosting defaults and a new visual design.

The initial WFS response contained a real record and reported 233,102 matches. The response allowed browser origins with `Access-Control-Allow-Origin: *`. Subsequent unfiltered and filtered requests returned empty collections. The service subsequently returned records again. The optional live test then passed nearby, number and object ID queries using the production parser. Empty results now have a retry button that clears the cached answer.

The municipal figure of over 393,000 recorded trees comes from the city's information page. It is not a live count from the open-data layer. Neither a server response timestamp nor the date of this review is presented as the date when a tree was surveyed.

The app's own TypeScript configuration is strict. Dependency declaration checking remains disabled because Happy DOM references a Node type that is not exported by the installed declarations.

The documented `npm run check` command passed TypeScript, type-aware Oxlint, Oxfmt and 99 deterministic tests. The separate live test passed, and the production build completed. Browser review covered the home page and real search interactions.

New prose was reviewed with the user's WSL pstack Unslop skill. This review removes filler and unsupported claims while retaining names, commands, measurements and source attribution.
