import type { MockAiMessage } from "@/lib/mock";

export function ChatBubble({
  msg,
  onConfirm,
  onCancel,
}: {
  msg: MockAiMessage;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-card px-4 py-3 text-sm ${
          isUser
            ? "rounded-br-btn bg-[#6C63FF] text-white"
            : "glass rounded-bl-btn text-white"
        }`}
      >
        <p className="leading-relaxed">{msg.content}</p>
        {!isUser && msg.action && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={onConfirm}
              className="flex-1 rounded-btn bg-[#6C63FF] py-2 text-xs font-semibold text-white transition hover:bg-[#5750e0]"
            >
              {msg.action.label}
            </button>
            <button
              onClick={onCancel}
              className="glass flex-1 rounded-btn py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
