"use client";

import { ArrowDown, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useJarvis } from "@/lib/client/store";
import { EmptyState } from "./EmptyState";
import { MessageItem } from "./MessageItem";

const STICKY_THRESHOLD = 140;

/** Nachrichtenverlauf mit "klebendem" Auto-Scroll während des Streamings. */
export function MessageList() {
  const messages = useJarvis((s) => s.messages);
  const active = useJarvis((s) => s.thinking || s.streaming);
  const loading = useJarvis((s) => s.loadingConversation);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const countRef = useRef(messages.length);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => {
    // Neue Nachricht vom Nutzer → immer nach unten springen.
    if (messages.length > countRef.current) stickRef.current = true;
    countRef.current = messages.length;
    if (stickRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Beim Öffnen des Chats direkt ans Ende.
    stickRef.current = true;
    scrollToBottom();
  }, [scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = distance < STICKY_THRESHOLD;
    setShowJump(distance > STICKY_THRESHOLD * 2);
  };

  const lastIndex = messages.length - 1;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-x-hidden overflow-y-auto overscroll-contain"
        data-testid="message-list"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 pb-8 sm:px-6">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center pt-16 text-ink-muted">
              <LoaderCircle className="size-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                streaming={active && index === lastIndex && message.role === "assistant"}
              />
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              stickRef.current = true;
              scrollToBottom(true);
            }}
            className="glass-strong hud-label absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] text-arc-soft"
          >
            <ArrowDown className="size-3.5" /> Neueste
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
