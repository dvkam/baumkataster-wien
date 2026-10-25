import type { MouseEvent, ReactNode } from "react";

import type { Navigate } from "../app";
import { searchToParams } from "../search";
import type { Search } from "../search";

type SearchLinkProps = {
  readonly to: Search;
  readonly navigate: Navigate;
  readonly className?: string;
  readonly children: ReactNode;
};

const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** A real link (open in new tab, copy address) that navigates in place on a plain click. */
export function SearchLink({ to, navigate, className, children }: SearchLinkProps) {
  const params = searchToParams(to).toString();
  return (
    <a
      href={params === "" ? "." : `?${params}`}
      className={className}
      onClick={(event) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
