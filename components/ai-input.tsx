"use client";

import * as React from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputActions,
  PromptInputActionGroup,
  PromptInputTextarea,
} from "@/components/nexus-ui/prompt-input";

// Pure chat composer for the Copilot — analysis (upload + mode) lives in the top panel,
// so this is just text → send. No attach / mode dropdown here (that was redundant).
export function AiInput({
  onSend,
  disabled = false,
  placeholder = "Ask about this animation…",
}: {
  onSend?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [input, setInput] = React.useState("");
  const hasValue = input.trim() !== "";

  const doSubmit = (value: string) => {
    if (!value.trim()) return;
    onSend?.(value);
    setInput("");
  };

  return (
    <PromptInput onSubmit={doSubmit} className="gap-2 rounded-2xl border bg-card p-2.5">
      <PromptInputTextarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-10 px-1.5 py-1.5"
      />
      <PromptInputActions className="justify-end px-1 py-0">
        <PromptInputActionGroup>
          <Button
            type="button"
            aria-label="Send"
            disabled={disabled}
            onClick={() => doSubmit(input)}
            className={cn(
              "size-8 rounded-md bg-transparent text-foreground transition hover:bg-accent active:scale-97 disabled:opacity-70",
              hasValue && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {disabled ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </Button>
        </PromptInputActionGroup>
      </PromptInputActions>
    </PromptInput>
  );
}
