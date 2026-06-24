"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

// The MotionLens Copilot: a chat that helps recreate the analyzed animation. Pass a `blueprint` to give
// it the current Motion Blueprint as context (sent in the request body to /api/chat).
export function Copilot({ blueprint }: { blueprint?: unknown }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat", body: { blueprint } }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full w-full min-w-0 min-h-0">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
