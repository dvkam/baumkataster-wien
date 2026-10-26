import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";

import { Baumkataster } from "./baumkataster.tsx";
import type { Catalog } from "./catalog";
import { parseSearch, searchToParams } from "./search";
import { ErrorBoundary } from "./ui";

function validatedParams(raw: Record<string, unknown>): Record<string, string> {
  const strings = Object.entries(raw).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return Object.fromEntries(searchToParams(parseSearch(new URLSearchParams(strings))));
}

export function createAppRouter(
  catalog: Catalog,
  history: RouterHistory = createBrowserHistory(),
  basepath = window.location.pathname,
) {
  const root = createRootRoute({
    component: () => (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    ),
  });
  const index = createRoute({
    getParentRoute: () => root,
    path: "/",
    validateSearch: validatedParams,
    component: () => <Baumkataster catalog={catalog} />,
  });
  return createRouter({
    routeTree: root.addChildren([index]),
    history,
    basepath,
    parseSearch: (value) => Object.fromEntries(new URLSearchParams(value)),
    stringifySearch: (value) => {
      const text = new URLSearchParams(validatedParams(value)).toString();
      return text === "" ? "" : `?${text}`;
    },
    defaultPendingMinMs: 0,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
