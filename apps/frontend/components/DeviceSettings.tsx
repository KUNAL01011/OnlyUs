'use client';

import { useEffect } from 'react';
import { X, Mic, Video, Volume2 } from 'lucide-react';
import type { MediaDevicesState } from '@/hooks/useMediaDevices';

function Select({
  label,
  icon,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: MediaDeviceInfo[];
  emptyLabel: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">System default</option>
        {options.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${emptyLabel} ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DeviceSettings({
  devices,
  onClose,
}: {
  devices: MediaDevicesState;
  onClose: () => void;
}) {
  // Reveal device labels (needs a one-time permission) when the panel opens.
  useEffect(() => {
    if (!devices.hasLabels) devices.ensureLabels();
    else devices.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audio & video devices</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Select
            label="Microphone"
            icon={<Mic className="h-4 w-4" />}
            value={devices.micId}
            onChange={devices.setMic}
            options={devices.mics}
            emptyLabel="Microphone"
          />
          <Select
            label="Camera"
            icon={<Video className="h-4 w-4" />}
            value={devices.cameraId}
            onChange={devices.setCamera}
            options={devices.cameras}
            emptyLabel="Camera"
          />
          {devices.speakerSelectionSupported && (
            <Select
              label="Speaker / output"
              icon={<Volume2 className="h-4 w-4" />}
              value={devices.speakerId}
              onChange={devices.setSpeaker}
              options={devices.speakers}
              emptyLabel="Speaker"
            />
          )}
        </div>

        {!devices.hasLabels && (
          <p className="mt-4 text-xs text-muted-foreground">
            Allow microphone/camera access to see your device names (like your earphones).
          </p>
        )}
        {!devices.speakerSelectionSupported && (
          <p className="mt-4 text-xs text-muted-foreground">
            Your browser doesn’t support choosing the speaker here — pick it in your system
            settings.
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
