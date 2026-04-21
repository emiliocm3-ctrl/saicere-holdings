"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendMessage, transcribeVoice, loadChatHistory } from "../actions";
import { RichCardRenderer } from "../components/rich-cards";
import { useVoiceRecorder } from "../components/use-voice-recorder";
import type { ChatMessage } from "@/lib/types";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={recording ? "text-red-500" : "text-text-dim"}
    >
      <rect x="7" y="2" width="6" height="10" rx="3" />
      <path d="M4 10a6 6 0 0012 0" />
      <path d="M10 16v2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2L8 10" />
      <path d="M16 2L11 16L8 10L2 7L16 2Z" />
    </svg>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-accent text-white rounded-br-md"
            : "bg-bg-elevated border border-border text-text rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.rich_cards && message.rich_cards.length > 0 && (
          <RichCardRenderer cards={message.rich_cards} />
        )}
        <p
          className={`mt-1 text-[10px] ${
            isUser ? "text-white/60" : "text-text-dim"
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-bg-elevated border border-border px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-text-dim animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-text-dim animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-text-dim animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function ChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    loadChatHistory().then((res) => {
      if (res.data.length > 0) setMessages(res.data);
      setLoadingHistory(false);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || sending) return;

      setInput("");

      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: "",
        role: "user",
        content,
        rich_cards: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setSending(true);

      try {
        const result = await sendMessage(content);
        if (result.data) {
          setMessages((prev) => {
            const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id);
            const historyResponse = loadChatHistory();
            historyResponse.then((res) => {
              if (res.data.length > 0) setMessages(res.data);
            });
            return withoutOptimistic;
          });
        }
      } catch {
        // keep optimistic message so user sees what they sent
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, sending],
  );

  const handleTranscript = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend],
  );

  const { state: voiceState, startRecording, stopRecording } = useVoiceRecorder(
    handleTranscript,
    transcribeVoice,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {loadingHistory && (
            <div className="flex justify-center py-20">
              <Spinner className="text-text-dim h-6 w-6" />
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-2xl bg-accent-dim p-4">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <rect x="4" y="6" width="24" height="18" rx="3" />
                  <path d="M4 18l8-6 4 3 6-5 6 4" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-text">Welcome to Saicere</h2>
              <p className="mt-2 max-w-sm text-sm text-text-muted leading-relaxed">
                I&apos;m your executive assistant. Tell me what&apos;s happening with your ventures,
                ask for a briefing, or dump whatever&apos;s on your mind.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["Give me a briefing", "List my projects", "Create a new project"].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-text-muted hover:border-accent/40 hover:text-text transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {sending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-bg/90 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3 sm:px-6"
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              if (voiceState === "idle") startRecording();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (voiceState === "recording") stopRecording();
            }}
            onPointerLeave={() => {
              if (voiceState === "recording") stopRecording();
            }}
            disabled={voiceState === "transcribing" || sending}
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-bg-elevated disabled:opacity-50"
            aria-label={voiceState === "recording" ? "Release to send" : "Hold to record"}
          >
            {voiceState === "transcribing" ? (
              <Spinner className="text-accent" />
            ) : (
              <MicIcon recording={voiceState === "recording"} />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              voiceState === "recording"
                ? "Recording... release to send"
                : "Message Saicere..."
            }
            disabled={sending || voiceState !== "idle"}
            className="flex-1 rounded-xl border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text placeholder:text-text-dim outline-none transition-colors focus:border-accent disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={sending || !input.trim() || voiceState !== "idle"}
            className="shrink-0 rounded-full bg-accent p-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send message"
          >
            {sending ? <Spinner className="text-white" /> : <SendIcon />}
          </button>
        </form>

        {voiceState === "recording" && (
          <div className="mx-auto max-w-2xl px-4 pb-2 sm:px-6">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs text-red-600">Recording — release to send</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
