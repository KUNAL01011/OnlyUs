'use client';

import { useEffect, useRef } from 'react';

const EMOJIS = [
  '❤️', '😍', '🥰', '😘', '😻', '💕', '💖', '💗', '💓', '💞',
  '😀', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😎',
  '😢', '😭', '🥺', '😴', '🤗', '🤔', '😅', '😳', '🥳', '🤩',
  '👍', '👎', '👋', '🙏', '👏', '🙌', '🤝', '✌️', '🤞', '💪',
  '🔥', '✨', '🌟', '⭐', '🌙', '☀️', '🌈', '☁️', '⚡', '❄️',
  '🎉', '🎊', '🎁', '🎂', '🍰', '☕', '🍕', '🍔', '🍟', '🍫',
  '🌹', '🌸', '🌺', '🌷', '💐', '🍀', '🦋', '🐱', '🐶', '🐻',
  '💯', '👀', '😏', '🫶', '🤍', '💜', '💙', '💚', '🧡', '💛',
];

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-14 right-0 z-20 w-72 rounded-xl border border-border bg-card p-3 shadow-2xl animate-fade-in"
    >
      <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto thin-scroll">
        {EMOJIS.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onPick(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl transition-transform hover:scale-125 hover:bg-muted"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
