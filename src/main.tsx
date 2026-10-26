import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createAppRouter } from "./app-router.tsx";
import { createCatalog } from "./catalog";
import { ErrorBoundary } from "./ui";

import "./styles.css";

const root = document.querySelector("#root");
if (root === null) throw new Error("index.html is missing #root");

const catalog = createCatalog({
  baseUrl:
    import.meta.env.VITE_OGD_BASE_URL ?? (import.meta.env.DEV ? "/ogd" : "https://data.wien.gv.at"),
  fetch: (input, init) => fetch(input, init),
});

const router = createAppRouter(catalog);
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
