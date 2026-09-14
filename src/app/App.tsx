import { useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ApplicationLayout } from "../components/layout/ApplicationLayout";
import { ChatWorkspace } from "../presentation/components/organisms/ChatWorkspace";
import { ActivityTimeline } from "../presentation/components/organisms/ActivityTimeline";
import { TaskQueue } from "../presentation/components/organisms/TaskQueue";
import { createActivityTimeline } from "../presentation/view-models/activityTimeline";
import { useChatSession } from "../presentation/hooks/useChatSession";
import { createMockChatSession } from "./bootstrap/createMockChatSession";
import "./app.css";

const operationalRegions = ["Agents", "Approvals"];

function AuthenticatedWorkspace() {
  const session = useChatSession(createMockChatSession);
  const { activity } = session;

  return (
    <ApplicationLayout
      chat={<ChatWorkspace {...session} />}
      operations={<>
        <div className="placeholder-region">
          {session.status === "pending" ? <p>Preparing activity...</p> : null}
          {session.status === "failed" ? <p>Activity could not be initialized.</p> : null}
          {activity ? <>
            {activity.stream.status === "failed" ? (
              <p>The activity stream could not be consumed. Received activity is shown below.</p>
            ) : null}
            {activity.stream.status === "ended" ? <p>The activity stream has ended.</p> : null}
            {activity.requiresResynchronization ? (
              <p>Activity has missing events. Resynchronization is required.</p>
            ) : null}
            <ActivityTimeline groups={createActivityTimeline(activity.conversationId, activity.events)} />
          </> : null}
        </div>
        <div className="placeholder-region">
          {session.status === "pending" ? <p>Preparing tasks...</p> : null}
          {session.status === "failed" ? <p>Tasks could not be initialized.</p> : null}
          {session.tasks?.load.status === "idle" ? <p>Preparing tasks...</p> : null}
          {session.tasks?.load.status === "loading" ? <p>Loading tasks...</p> : null}
          {session.tasks?.load.status === "failed" ? (
            <p>The task list could not be loaded.</p>
          ) : null}
          {session.taskQueue && (session.tasks?.load.status === "ready" || session.taskQueue.rows.length > 0) ? (
            <TaskQueue queue={session.taskQueue} />
          ) : null}
        </div>
        {operationalRegions.map((region) => (
          <section className="placeholder-region" key={region}>
            <h2>{region}</h2>
            <p>This operational view will appear here.</p>
          </section>
        ))}
      </>}
    />
  );
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <AuthenticatedWorkspace />;
}
