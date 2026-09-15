'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Smile, ImageIcon, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type ChatMessage, type Session } from '@/lib/api';
import { cn, formatTime } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';

export function Chat({ socket, session }: { socket: Socket; session: Session }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load history once.
  useEffect(() => {
    api
      .history()
      .then(({ messages }) => setMessages(messages))
      .catch(() => {});
  }, []);

  // Live messages + typing.
  useEffect(() => {
    const onMessage = (m: ChatMessage) => {
      setMessages((prev) => (prev.some((x) => x._id === m._id) ? prev : [...prev, m]));
    };
    const onTyping = ({ slot, typing }: { slot: string; typing: boolean }) => {
      if (slot !== session.slot) setPeerTyping(typing);
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [socket, session.slot]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  function emitTyping(typing: boolean) {
    socket.emit('chat:typing', { typing });
  }

  function handleDraftChange(v: string) {
    setDraft(v);
    emitTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 1200);
  }

  function send(kind: 'text' | 'gif', body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    socket.emit('chat:message', { kind, body: trimmed });
    if (kind === 'text') setDraft('');
    emitTyping(false);
    setShowEmoji(false);
    setShowGif(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send('text', draft);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 thin-scroll">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-2xl">💬</p>
            <p className="mt-2 text-sm">This is the very beginning of Only Us.</p>
            <p className="text-xs">Say hello 👋</p>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.senderSlot === session.slot;
          return (
            <div
              key={m._id}
              className={cn('flex animate-fade-in', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                  mine
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-muted text-foreground'
                )}
              >
                {m.kind === 'gif' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.body}
                    alt="gif"
                    className="max-h-56 rounded-lg"
                    loading="lazy"
                  />
                ) : (
                  <span className="whitespace-pre-wrap break-words leading-relaxed">
                    {m.body}
                  </span>
                )}
                <div
                  className={cn(
                    'mt-1 text-right text-[10px]',
                    mine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        {peerTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="relative border-t border-border bg-card/60 p-3"
      >
        {showEmoji && (
          <EmojiPicker
            onPick={(e) => setDraft((d) => d + e)}
            onClose={() => setShowEmoji(false)}
          />
        )}
        {showGif && (
          <GifPicker onPick={(url) => send('gif', url)} onClose={() => setShowGif(false)} />
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowGif(false);
            }}
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowGif((v) => !v);
              setShowEmoji(false);
            }}
            title="GIF"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <input
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Message…"
            className="h-11 flex-1 rounded-full border border-border bg-input px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <Button type="submit" size="icon" className="rounded-full" disabled={!draft.trim()}>
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="h-2 w-2 animate-pulse-soft rounded-full bg-muted-foreground/70"
      style={{ animationDelay: delay }}
    />
  );
}
