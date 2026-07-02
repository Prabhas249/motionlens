"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import { cn } from "@/lib/utils";
import { AiInput } from "@/components/ai-input";

// Right-pane Copilot: a Gemini chat whose composer IS the nexus AiInput.
export function CopilotChat({ blueprint }: { blueprint?: unknown }) {
  // NOTE: the transport (and any body baked into it) is captured ONCE when the
  // chat instance is created — at mount `blueprint` is still null, so the body
  // must be attached per-send (see sendMessage below), not here.
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* messages */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-2xl font-medium text-foreground/90">How can I help?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask about the motion, timings, or how to recreate it.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.parts.map((p, i) =>
                  p.type === "text" ? <span key={`${m.id}-${i}`}>{p.text}</span> : null,
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* composer = nexus AiInput */}
      <div className="border-t p-3">
        <AiInput
          disabled={isBusy}
          onSend={(text) => {
            // body attached per-send so the CURRENT blueprint rides along
            if (text.trim()) sendMessage({ text }, { body: { blueprint } });
          }}
        />
      </div>
    </div>
  );
}
