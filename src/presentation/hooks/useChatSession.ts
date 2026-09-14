import { useEffect, useRef, useState } from "react";
import type {
  ChatSubmission,
  ChatSubmissionController,
} from "../../application/state/chatSubmissions";

type SessionStatus = "pending" | "ready" | "failed";

export function useChatSession(
  createSession: () => Promise<ChatSubmissionController>,
) {
  const controllerRef = useRef<ChatSubmissionController | null>(null);
  const [status, setStatus] = useState<SessionStatus>("pending");
  const [submissions, setSubmissions] = useState<ChatSubmission[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    controllerRef.current = null;
    setStatus("pending");
    setSubmissions([]);
    setDraft("");

    async function initialize() {
      try {
        const controller = await createSession();
        if (!active) return;

        controllerRef.current = controller;
        const refresh = () => {
          if (active) setSubmissions(controller.getSnapshot());
        };
        unsubscribe = controller.subscribe(refresh);
        refresh();
        setStatus("ready");
      } catch {
        if (active) setStatus("failed");
      }
    }

    void initialize();
    return () => {
      active = false;
      unsubscribe?.();
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
    draft,
    canSubmit: status === "ready" && draft.trim().length > 0,
    onDraftChange: setDraft,
    onSubmit: submit,
  };
}
