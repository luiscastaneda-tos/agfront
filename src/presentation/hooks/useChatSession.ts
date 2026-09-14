import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentRegistryController,
  AgentRegistrySnapshot,
} from "../../application/state/agentRegistry";
import type {
  ChatSubmission,
  ChatSubmissionController,
} from "../../application/state/chatSubmissions";
import type {
  ConversationActivityController,
  ConversationActivitySnapshot,
} from "../../application/state/conversationActivity";
import type {
  ConversationTasksController,
  ConversationTasksSnapshot,
} from "../../application/state/conversationTasks";
import { createEventStore } from "../../application/state/eventStore";
import type {
  ConversationApprovalsController,
  ConversationApprovalsSnapshot,
} from "../../application/state/conversationApprovals";
import { createApprovalCards } from "../view-models/approvalCards";
import { createTaskQueue } from "../view-models/taskQueue";
import { createAgentPanel } from "../view-models/agentPanel";
import { createBackgroundWork } from "../view-models/backgroundWork";

interface ChatSessionControllers {
  chat: ChatSubmissionController;
  activity: ConversationActivityController;
  tasks: ConversationTasksController;
  registry: AgentRegistryController;
  approvals: ConversationApprovalsController;
}

type SessionStatus = "pending" | "ready" | "failed";

export function useChatSession(
  createSession: () => Promise<ChatSessionControllers>,
) {
  const controllerRef = useRef<ChatSubmissionController | null>(null);
  const [status, setStatus] = useState<SessionStatus>("pending");
  const [submissions, setSubmissions] = useState<ChatSubmission[]>([]);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState<ConversationActivitySnapshot | null>(null);
  const [tasks, setTasks] = useState<ConversationTasksSnapshot | null>(null);
  const [registry, setRegistry] = useState<AgentRegistrySnapshot | null>(null);
  const [approvals, setApprovals] = useState<ConversationApprovalsSnapshot | null>(null);
  const approvalCards = useMemo(() => {
    if (!approvals) return null;
    return createApprovalCards(approvals.conversationId, approvals.approvals);
  }, [approvals]);
  const agentPanel = useMemo(() => {
    if (!registry || !activity) return null;
    const store = createEventStore();
    store.ingestBatch(activity.events);
    return createAgentPanel(activity.conversationId, registry.agents, store);
  }, [registry, activity]);
  const taskQueue = useMemo(() => {
    if (!tasks) return null;
    const store = createEventStore();
    if (activity?.conversationId === tasks.conversationId) {
      store.ingestBatch(activity.events);
    }
    return createTaskQueue(tasks.conversationId, tasks.tasks, store);
  }, [tasks, activity]);
  const backgroundWork = useMemo(() => createBackgroundWork(
    taskQueue,
    tasks?.load ?? null,
    activity?.stream ?? null,
  ), [taskQueue, tasks, activity]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let unsubscribeActivity: (() => void) | undefined;
    let unsubscribeTasks: (() => void) | undefined;
    let unsubscribeRegistry: (() => void) | undefined;
    let unsubscribeApprovals: (() => void) | undefined;
    let ownedSession: ChatSessionControllers | undefined;
    controllerRef.current = null;
    setStatus("pending");
    setSubmissions([]);
    setDraft("");
    setActivity(null);
    setTasks(null);
    setRegistry(null);
    setApprovals(null);

    function releaseSession() {
      unsubscribe?.();
      unsubscribeActivity?.();
      unsubscribeTasks?.();
      unsubscribeRegistry?.();
      unsubscribeApprovals?.();
      ownedSession?.activity.dispose();
      ownedSession?.tasks.dispose();
      ownedSession?.registry.dispose();
      ownedSession?.approvals.dispose();
    }

    async function initialize() {
      try {
        const session = await createSession();
        if (!active) {
          session.activity.dispose();
          session.tasks.dispose();
          session.registry.dispose();
          session.approvals.dispose();
          return;
        }
        ownedSession = session;
        const controller = session.chat;

        controllerRef.current = controller;
        const refresh = () => {
          if (active) setSubmissions(controller.getSnapshot());
        };
        unsubscribe = controller.subscribe(refresh);
        const refreshActivity = () => {
          if (active) setActivity(session.activity.getSnapshot());
        };
        unsubscribeActivity = session.activity.subscribe(refreshActivity);
        const refreshTasks = () => {
          if (active) setTasks(session.tasks.getSnapshot());
        };
        unsubscribeTasks = session.tasks.subscribe(refreshTasks);
        const refreshRegistry = () => {
          if (active) setRegistry(session.registry.getSnapshot());
        };
        unsubscribeRegistry = session.registry.subscribe(refreshRegistry);
        const refreshApprovals = () => {
          if (active) setApprovals(session.approvals.getSnapshot());
        };
        unsubscribeApprovals = session.approvals.subscribe(refreshApprovals);
        refresh();
        refreshActivity();
        refreshTasks();
        refreshRegistry();
        refreshApprovals();
        session.activity.start();
        setStatus("ready");
        session.tasks.start();
        session.registry.start();
        session.approvals.start();
      } catch {
        releaseSession();
        if (active) {
          controllerRef.current = null;
          setActivity(null);
          setTasks(null);
          setRegistry(null);
          setApprovals(null);
          setStatus("failed");
        }
        active = false;
      }
    }

    void initialize();
    return () => {
      active = false;
      releaseSession();
      controllerRef.current = null;
    };
  }, [createSession]);

  function submit() {
    const controller = controllerRef.current;
    if (!controller || draft.trim().length === 0) return;

    // The controller publishes the pending entry before its first await.
    void controller.submit(draft);
    setDraft("");
  }

  return {
    status,
    submissions,
    activity,
    tasks,
    taskQueue,
    backgroundWork,
    registry,
    agentPanel,
    approvals,
    approvalCards,
    draft,
    canSubmit: status === "ready" && draft.trim().length > 0,
    onDraftChange: setDraft,
    onSubmit: submit,
  };
}
