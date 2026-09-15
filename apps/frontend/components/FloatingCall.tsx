'use client';

import { useEffect, useRef } from 'react';
import { PhoneOff, Maximize2, MonitorUp } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import type { UseCall } from '@/hooks/useCall';
import { cn } from '@/lib/utils';

/**
 * A small floating video window shown on mobile while the user is reading chat.
 * It's visual-only (muted) — the call's audio comes from the always-mounted
 * CallPanel <video>, so there's never doubled sound. Tap to expand to the call.
 */
export function FloatingCall({
  call,
  peerName,
  peerAvatar,
  onExpand,
}: {
  call: UseCall;
  peerName: string;
  peerAvatar?: string;
  onExpand: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  const connecting = call.state === 'outgoing' || call.state === 'connecting';

  return (
    <div className="fixed bottom-24 right-3 z-40 lg:hidden">
      <div className="relative h-44 w-28 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
        <button onClick={onExpand} className="absolute inset-0 h-full w-full" aria-label="Expand call">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn('h-full w-full object-cover', call.hasRemote ? 'opacity-100' : 'opacity-0')}
          />
          {!call.hasRemote && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Avatar name={peerName} avatar={peerAvatar} size={44} />
              <span className="text-[10px] text-white/80">
                {connecting ? 'Connecting…' : peerName}
              </span>
            </span>
          )}
        </button>

        {/* Top bar: peer name / screen-share badge + expand */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 py-1">
          <span className="flex items-center gap-1 truncate text-[10px] font-medium text-white">
            {call.peerSharing && <MonitorUp className="h-3 w-3 shrink-0" />}
            {call.peerSharing ? 'Screen' : peerName}
          </span>
          <Maximize2 className="h-3.5 w-3.5 shrink-0 text-white/80" />
        </div>

        {/* Hang up */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            call.hangup();
          }}
          className="absolute bottom-2 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105"
          title="End call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
