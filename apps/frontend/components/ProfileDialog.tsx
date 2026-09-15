'use client';

import { useRef, useState } from 'react';
import { X, Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/Avatar';
import { api, type Profile } from '@/lib/api';

/** Resize an image file to a square <=256px JPEG data URL to keep it small. */
function fileToAvatar(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = max;
        canvas.height = max;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unsupported'));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (p: Profile) => void;
}) {
  const [name, setName] = useState(profile.name ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatar, setAvatar] = useState(profile.avatar ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    try {
      const dataUrl = await fileToAvatar(file);
      setAvatar(dataUrl);
      setError(null);
    } catch {
      setError('Could not process that image.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { profile: updated } = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatar,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your profile</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name={name || 'You'} avatar={avatar} size={96} />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          {avatar && (
            <button
              onClick={() => setAvatar('')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" /> Remove photo
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={120}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Bio <span className="text-xs">({bio.length}/280)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="A little about you…"
              className="w-full resize-none rounded-lg border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
