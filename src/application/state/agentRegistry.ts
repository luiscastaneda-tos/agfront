import type { AgentDescriptor } from '../../contracts';
import type { AgentTransport } from '../ports/AgentTransport';

export type AgentRegistryLoadState =
  | { status: 'idle' | 'loading' | 'ready' }
  | { status: 'failed'; failureDescription: string };

export interface AgentRegistrySnapshot {
  agents: AgentDescriptor[];
  load: AgentRegistryLoadState;
  disposed: boolean;
}

export interface AgentRegistryController {
  /** Starts once; an earlier refresh also counts as the initial load. */
  start(): void;
  /** Loads again, coalescing calls while a request is pending. */
  refresh(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): AgentRegistrySnapshot;
  /** Terminal; retains the last registry and load state without notifying. */
  dispose(): void;
}

function copyDescriptor(agent: AgentDescriptor): AgentDescriptor {
  return { ...agent, toolNames: [...agent.toolNames] };
}

/** In-memory registry snapshots; registry-provided statuses stay intact. */
export function createAgentRegistryController(
  transport: AgentTransport,
): AgentRegistryController {
  const listeners = new Set<() => void>();
  let agents: AgentDescriptor[] = [];
  let load: AgentRegistryLoadState = { status: 'idle' };
  let started = false;
  let pending = false;
  let disposed = false;

  function notify(): void {
    for (const listener of [...listeners]) {
      if (disposed) return;
      if (!listeners.has(listener)) continue;
      try {
        listener();
      } catch {
        // An observer cannot interrupt loading or change its outcome.
      }
    }
  }

  async function fetchAgents(): Promise<void> {
    try {
      // A loading subscriber may have disposed synchronously.
      if (disposed) return;
      const response = await transport.listAgents();
      if (disposed) return;

      const seen = new Set<string>();
      const nextAgents: AgentDescriptor[] = [];
      for (const agent of response) {
        if (seen.has(agent.name)) continue;
        seen.add(agent.name);
        nextAgents.push(copyDescriptor(agent));
      }
      agents = nextAgents;
      load = { status: 'ready' };
    } catch {
      if (disposed) return;
      load = {
        status: 'failed',
        failureDescription: 'The agent registry could not be loaded.',
      };
    } finally {
      pending = false;
    }
    if (!disposed) notify();
  }

  function refresh(): void {
    if (disposed || pending) return;
    started = true;
    // Guard before notifying because observers can call start or refresh.
    pending = true;
    load = { status: 'loading' };
    notify();
    void fetchAgents();
  }

  return {
    start() {
      if (disposed || started) return;
      refresh();
    },
    refresh,
    subscribe(listener) {
      if (disposed) return () => {};
      const subscription = () => listener();
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
    getSnapshot() {
      return {
        agents: agents.map(copyDescriptor),
        load: { ...load },
        disposed,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
    },
  };
}
