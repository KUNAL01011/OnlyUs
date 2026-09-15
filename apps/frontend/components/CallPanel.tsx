'use client';

import { useEffect, useRef } from 'react';
import {
  Video,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  MonitorX,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import type { UseCall } from '@/hooks/useCall';
import { cn } from '@/lib/utils';

interface Props {
  call: UseCall;
  peerName: string;
  peerAvatar?: string;
  peerOnline: boolean;
  speakerId: string;
  onOpenDevices: () => void;
}

export function CallPanel({ call, peerName, peerAvatar, peerOnline, speakerId, onOpenDevices }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  // Route call audio to the chosen speaker/earphones when supported.
  useEffect(() => {
    const v = remoteVideoRef.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (v?.setSinkId && speakerId) v.setSinkId(speakerId).catch(() => {});
  }, [speakerId, call.remoteStream]);

  const { state, micOn, camOn, sharing, peerSharing, hasRemote, error } = call;
  const inCall = state === 'connected' || state === 'connecting';

  // ─────────────────────────── Idle (start) ───────────────────────────
  if (state === 'idle') {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <DeviceButton onClick={onOpenDevices} tone="muted" className="absolute right-4 top-4" />
        <div className="relative">
          <Avatar name={peerName} avatar={peerAvatar} size={96} />
          <span
            className={cn(
              'absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card',
              peerOnline ? 'bg-emerald-400' : 'bg-muted-foreground/50'
            )}
          />
        </div>
        <div>
          <p className="text-xl font-semibold">{peerName}</p>
          <p className={cn('text-sm', peerOnline ? 'text-emerald-400' : 'text-muted-foreground')}>
            {peerOnline ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" disabled={!peerOnline} onClick={() => call.startCall('video')} className="w-full">
            <Video className="h-5 w-5" /> Start Video Call
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!peerOnline}
            onClick={() => call.startCall('audio')}
            className="w-full"
          >
            <Phone className="h-5 w-5" /> Audio Call
          </Button>
        </div>

        {!peerOnline && (
          <p className="text-xs text-muted-foreground">
            {peerName} is offline. You can call once they’re online.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ─────────────────────────── Incoming ───────────────────────────
  if (state === 'incoming') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="animate-pulse-soft">
          <Avatar name={peerName} avatar={peerAvatar} size={112} />
        </div>
        <div>
          <p className="text-xl font-semibold">{peerName} is calling…</p>
          <p className="text-sm text-muted-foreground">Incoming {call.incomingMode} call</p>
        </div>
        <div className="flex gap-4">
          <Button variant="danger" size="lg" onClick={call.reject}>
            <PhoneOff className="h-5 w-5" /> Decline
          </Button>
          <Button variant="success" size="lg" onClick={call.accept}>
            <Phone className="h-5 w-5" /> Accept
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── Outgoing / active ──────────────────────
  return (
    <div className="relative flex h-full flex-col bg-black/40">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn('h-full w-full object-cover', hasRemote ? 'opacity-100' : 'opacity-0')}
        />

        {!hasRemote && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-24 w-24 animate-pulse-soft items-center justify-center rounded-full bg-primary/20 text-4xl">
              {state === 'outgoing' ? '📲' : '⏳'}
            </div>
            <p className="text-lg font-medium">
              {state === 'outgoing' ? `Calling ${peerName}…` : 'Connecting…'}
            </p>
          </div>
        )}

        {peerSharing && hasRemote && (
          <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {peerName} is sharing their screen
          </span>
        )}

        {/* Local self-view */}
        <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-xl sm:h-40 sm:w-32">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn('h-full w-full object-cover', camOn || sharing ? '' : 'opacity-0')}
          />
          {!camOn && !sharing && (
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🙈</div>
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-[9px] text-white">
            You
          </span>
        </div>
      </div>

      {error && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/50 p-4 sm:gap-3">
        <ControlButton
          active={micOn}
          onClick={call.toggleMic}
          on={<Mic className="h-5 w-5" />}
          off={<MicOff className="h-5 w-5" />}
          label="Mic"
        />
        <ControlButton
          active={camOn}
          onClick={call.toggleCam}
          on={<Video className="h-5 w-5" />}
          off={<VideoOff className="h-5 w-5" />}
          label="Camera"
        />
        <ControlButton
          active={!sharing}
          disabled={!inCall}
          onClick={call.toggleScreen}
          on={<MonitorUp className="h-5 w-5" />}
          off={<MonitorX className="h-5 w-5" />}
          label="Share"
        />
        <DeviceButton onClick={onOpenDevices} />
        <Button
          variant="danger"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={call.hangup}
          title="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

function DeviceButton({
  onClick,
  className,
  tone = 'light',
}: {
  onClick: () => void;
  className?: string;
  tone?: 'light' | 'muted';
}) {
  return (
    <button
      onClick={onClick}
      title="Devices"
      className={cn(
        'flex items-center justify-center rounded-full transition-colors',
        tone === 'muted'
          ? 'h-10 w-10 bg-muted text-muted-foreground hover:bg-muted/70'
          : 'h-14 w-14 bg-white/15 text-white hover:bg-white/25',
        className
      )}
    >
      <Settings2 className="h-5 w-5" />
    </button>
  );
}

function ControlButton({
  active,
  onClick,
  on,
  off,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  on: React.ReactNode;
  off: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'flex h-14 w-14 flex-col items-center justify-center rounded-full transition-colors disabled:opacity-40',
        active ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-black hover:bg-white/90'
      )}
    >
      {active ? on : off}
    </button>
  );
}
