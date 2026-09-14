import { useState } from "react";
import { LoginForm } from "../auth/LoginForm";
import { ApplicationLayout } from "../components/layout/ApplicationLayout";
import { ChatWorkspace } from "../presentation/components/organisms/ChatWorkspace";
import { ActivityTimeline } from "../presentation/components/organisms/ActivityTimeline";
import { TaskQueue } from "../presentation/components/organisms/TaskQueue";
import { AgentPanel } from "../presentation/components/organisms/AgentPanel";
import { ApprovalCards } from "../presentation/components/organisms/ApprovalCards";
import { createActivityTimeline } from "../presentation/view-models/activityTimeline";
import { useChatSession } from "../presentation/hooks/useChatSession";
import { createLiveChatSession } from "./bootstrap/createLiveChatSession";
import "./app.css";

function AuthenticatedWorkspace() {
  const session = useChatSession(createLiveChatSession);
  const { activity } = session;

  return (
    <ApplicationLayout
      chat={<ChatWorkspace {...session} />}
      operations={<>
        <div className="placeholder-region">
          {session.status === "pending" ? <p>Preparing activity...</p> : null}
          {session.status === "failed" ? <p>Activity could not be initialized.</p> : null}
          {activity ? <>
            {activity.stream.status === "connecting" ? (
              <p>Connecting to activity updates. Observations may be incomplete.</p>
            ) : null}
            {activity.stream.status === "connected" ? <p>Activity stream connected.</p> : null}
            {activity.stream.status === "reconnecting" ? (
              <p>Reconnecting to activity updates. Received activity is retained and may be outdated.</p>
            ) : null}
            {activity.stream.status === "authentication-required" ? (
              <p>Authentication is required. Reload and sign in again. Reloading starts a clean demo session.</p>
            ) : null}
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
        <div className="placeholder-region">
          {session.status === "pending" ? <p>Preparing agents...</p> : null}
          {session.status === "failed" ? <p>Agents could not be initialized.</p> : null}
          {session.registry?.load.status === "idle" ? <p>Preparing agents...</p> : null}
          {session.registry?.load.status === "loading" ? <p>Loading agents...</p> : null}
          {session.registry?.load.status === "failed" ? (
            <p>The agent registry could not be loaded.</p>
          ) : null}
          {session.agentPanel && (session.registry?.load.status === "ready" || session.agentPanel.rows.length > 0) ? (
            <AgentPanel panel={session.agentPanel} />
          ) : null}
        </div>
        <div className="placeholder-region">
          {session.status === "pending" ? <p>Preparing approvals...</p> : null}
          {session.status === "failed" ? <p>Approvals could not be initialized.</p> : null}
          {session.approvals?.load.status === "idle" ? <p>Preparing approvals...</p> : null}
          {session.approvals?.load.status === "loading" ? <p>Loading approvals...</p> : null}
          {session.approvals?.load.status === "failed" ? (
            <p>The approval list could not be loaded.</p>
          ) : null}
          {session.approvalCards && (session.approvals?.load.status === "ready" || session.approvalCards.length > 0) ? (
            <ApprovalCards rows={session.approvalCards} />
          ) : null}
        </div>
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
