"use client";

import { SendIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiChat() {
  const getContent = useCvStore((s) => s.getContent);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = trpc.ai.chat.useMutation({
    onSuccess: ({ result }) => {
      setMessages((prev) => [...prev, { role: "assistant", content: result }]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    },
  });

  function send() {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    const next: Message = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, next]);
    mutation.mutate({
      messages: [...messages, next],
      cvSnapshot: buildSnapshot(getContent()),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Chat dengan AI</h3>

      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tanya apa saja tentang CV Anda — strategi, perbaikan, atau analisis
          posisi tertentu.
        </p>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only chat log
              key={i}
              className={
                msg.role === "user"
                  ? "ml-4 rounded-lg bg-primary/10 px-3 py-2 text-xs whitespace-pre-wrap"
                  : "rounded-lg bg-muted px-3 py-2 text-xs whitespace-pre-wrap"
              }
            >
              {msg.content}
            </div>
          ))}
          {mutation.isPending && (
            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              AI sedang mengetik...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya sesuatu tentang CV Anda..."
          className="min-h-[60px] resize-none text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          disabled={!input.trim() || mutation.isPending}
          onClick={send}
          aria-label="Kirim"
        >
          <SendIcon />
        </Button>
      </div>

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
