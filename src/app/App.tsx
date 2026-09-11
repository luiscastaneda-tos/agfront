import { ApplicationLayout } from "../components/layout/ApplicationLayout";
import "./app.css";

const operationalRegions = ["Activity", "Tasks", "Agents", "Approvals"];

export function App() {
  return (
    <ApplicationLayout
      chat={
        <section aria-labelledby="chat-workspace-heading">
          <h1 id="chat-workspace-heading">Chat workspace</h1>
          <p>Conversation controls and messages will appear here.</p>
        </section>
      }
      operations={operationalRegions.map((region) => (
        <section className="placeholder-region" key={region}>
          <h2>{region}</h2>
          <p>This operational view will appear here.</p>
        </section>
      ))}
    />
  );
}
