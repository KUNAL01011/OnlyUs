'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const CODE_LENGTH = 4;

export function CodeEntry() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  function setDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function enter() {
    if (code.length < CODE_LENGTH) {
      setError('Please enter your full code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.enter(code, name.trim() || 'Friend');
      router.push('/space');
    } catch (err) {
      setError((err as Error).message);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="pointer-events-none absolute inset-0 bg-background/40" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-3xl font-bold text-transparent">
              Only Us
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">A private space for two.</p>
          </div>

          <label className="mb-2 block text-center text-sm text-muted-foreground">
            Enter your unique code
          </label>
          <div className="mb-5 flex justify-center gap-3" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border border-border bg-input text-center text-2xl font-semibold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring"
              />
            ))}
          </div>

          <Input
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enter()}
            className="mb-4 text-center"
          />

          {error && (
            <p className="mb-4 text-center text-sm text-red-400 animate-fade-in">{error}</p>
          )}

          <Button className="w-full" size="lg" onClick={enter} disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter Only Us'}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Just you. Just me. <span className="text-primary">Only Us.</span>
        </p>
      </div>
    </div>
  );
}
