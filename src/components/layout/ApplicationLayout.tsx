import type { ReactNode } from "react";
import "./application-layout.css";

interface ApplicationLayoutProps {
  chat: ReactNode;
  operations: ReactNode;
}

export function ApplicationLayout({ chat, operations }: ApplicationLayoutProps) {
  return (
    <main className="application-layout">
      <div className="application-layout__chat">{chat}</div>
      <aside
        className="application-layout__operations"
        aria-labelledby="operational-panel-heading"
      >
        <h2 id="operational-panel-heading">Operational panel</h2>
        <div className="application-layout__operational-regions">{operations}</div>
      </aside>
    </main>
  );
}
