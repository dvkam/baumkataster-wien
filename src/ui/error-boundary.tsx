import { Component } from "react";
import type { ReactNode } from "react";

type ErrorBoundaryProps = { readonly children: ReactNode };
type ErrorBoundaryState = { readonly failed: boolean };

/** Last resort for bugs; expected failures (network, data) are handled where they happen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="status status-failed" role="alert">
        <p>Etwas ist schiefgegangen.</p>
        <button
          type="button"
          className="button button-quiet pressable"
          onClick={() => {
            window.location.reload();
          }}
        >
          Neu laden
        </button>
      </div>
    );
  }
}
