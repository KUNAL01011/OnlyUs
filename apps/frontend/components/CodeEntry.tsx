'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const MAX_CODE_LENGTH = 32;

export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your code.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name so your friend knows it’s you.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.enter(trimmed, name.trim());
      router.push('/space');
    } catch (err) {
      setError((err as Error).message);
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
          <Input
            autoFocus
            value={code}
            maxLength={MAX_CODE_LENGTH}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            placeholder="e.g. abc3"
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enter()}
            className="mb-5 h-14 text-center text-2xl font-semibold tracking-[0.35em] placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
          />

          <Input
            placeholder="Your name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enter()}
            className="mb-4 text-center"
          />

          {error && (
            <p className="mb-4 text-center text-sm text-red-400 animate-fade-in">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={enter}
            disabled={loading || !name.trim() || !code.trim()}
          >
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
