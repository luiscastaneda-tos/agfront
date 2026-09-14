import { useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ApplicationLayout } from "../components/layout/ApplicationLayout";
import { ChatWorkspace } from "../presentation/components/organisms/ChatWorkspace";
import { useChatSession } from "../presentation/hooks/useChatSession";
import { createMockChatSession } from "./bootstrap/createMockChatSession";
import "./app.css";

const operationalRegions = ["Activity", "Tasks", "Agents", "Approvals"];

function AuthenticatedChatWorkspace() {
  const session = useChatSession(createMockChatSession);
  return <ChatWorkspace {...session} />;
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <ApplicationLayout
      chat={<AuthenticatedChatWorkspace />}
      operations={operationalRegions.map((region) => (
        <section className="placeholder-region" key={region}>
          <h2>{region}</h2>
          <p>This operational view will appear here.</p>
        </section>
      ))}
    />
  );
}
