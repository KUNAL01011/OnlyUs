'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { GIPHY_KEY } from '@/lib/config';
import { Input } from '@/components/ui/input';

interface Gif {
  id: string;
  url: string;
  preview: string;
}

export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Debounced search (trending when query is empty).
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = query.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
              query
            )}&limit=24&rating=pg-13`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=pg-13`;
        const res = await fetch(endpoint);
        const json = await res.json();
        if (!active) return;
        const items: Gif[] = (json.data ?? []).map((g: any) => ({
          id: g.id,
          url: g.images?.fixed_height?.url ?? g.images?.original?.url,
          preview: g.images?.fixed_height_small?.url ?? g.images?.preview_gif?.url,
        }));
        setGifs(items.filter((g) => g.url));
      } catch {
        if (active) setGifs([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div
      ref={ref}
      className="absolute bottom-14 right-0 z-20 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-3 shadow-2xl animate-fade-in"
    >
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search GIFs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="relative min-h-[180px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto thin-scroll">
          {gifs.map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g.url)}
              className="overflow-hidden rounded-lg border border-border transition-transform hover:scale-[1.03]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.preview || g.url}
                alt="gif"
                className="h-24 w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
        {!loading && gifs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No GIFs found.
          </p>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Powered by GIPHY
      </p>
    </div>
  );
}
