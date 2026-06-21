"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { sendAiMessage, type AiMessage } from "@/lib/api";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { type MockAiMessage } from "@/lib/mock";

let msgId = 0;
function newId() { return String(++msgId); }

const GREETING: MockAiMessage = {
  id: "welcome",
  role: "ai",
  content: "Hi! I'm your Rivio AI assistant. I can help you send payments, check your balances, swap tokens, and answer DeFi questions. What would you like to do?",
};

const SUGGESTIONS = ["What's my balance?", "Help me send USDC", "How do I swap SUI?"];

export default function AiPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MockAiMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getJwt().catch(() => null).then((jwt) => {
      if (!jwt) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || typing) return;
    setInput("");

    const userMsg: MockAiMessage = { id: newId(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");

      const history: AiMessage[] = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role as "user" | "ai", content: m.content }));

      const { reply } = await sendAiMessage(jwt, history);
      setMessages((prev) => [...prev, { id: newId(), role: "ai", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "ai", content: "Sorry, I couldn't connect right now. Please try again." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="app-bg flex min-h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pb-4 pt-safe pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-strong text-neutral transition-all hover:scale-105"
        >
          <IconArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-headline text-base text-white">Rivio AI</h1>
          <p className="text-caption text-neutral">GPT-4o · your wallet assistant</p>
        </div>
        <div className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 pt-2">
        <div className="space-y-3">
          {messages.map((m) => (
            <ChatBubble
              key={m.id}
              msg={m}
              onConfirm={() => router.push("/send")}
              onCancel={() => {}}
            />
          ))}

          {/* Suggestion chips — only shown before first user message */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="glass rounded-card rounded-bl-btn px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar — sits above the floating nav */}
      <div className="fixed bottom-24 left-0 right-0 mx-auto max-w-shell px-4">
        <div className="glass-strong flex items-center gap-2 rounded-[22px] px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || typing}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg transition-all disabled:opacity-35 active:scale-95"
          >
            <IconSend size={15} />
          </button>
        </div>
      </div>

      <FloatingNav />
    </div>
  );
}
