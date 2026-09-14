import { useEffect, useRef, useState } from "react";
import type {
  ChatSubmission,
  ChatSubmissionController,
} from "../../application/state/chatSubmissions";
import type {
  ConversationActivityController,
  ConversationActivitySnapshot,
} from "../../application/state/conversationActivity";

interface ChatSessionControllers {
  chat: ChatSubmissionController;
  activity: ConversationActivityController;
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

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let unsubscribeActivity: (() => void) | undefined;
    let ownedSession: ChatSessionControllers | undefined;
    controllerRef.current = null;
    setStatus("pending");
    setSubmissions([]);
    setDraft("");
    setActivity(null);

    function releaseSession() {
      unsubscribe?.();
      unsubscribeActivity?.();
      ownedSession?.activity.dispose();
    }

    async function initialize() {
      try {
        const session = await createSession();
        if (!active) {
          session.activity.dispose();
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
        refresh();
        refreshActivity();
        session.activity.start();
        setStatus("ready");
      } catch {
        releaseSession();
        if (active) {
          controllerRef.current = null;
          setStatus("failed");
        }
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
    draft,
    canSubmit: status === "ready" && draft.trim().length > 0,
    onDraftChange: setDraft,
    onSubmit: submit,
  };
}
