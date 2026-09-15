'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { CallManager, type CallState, type CallMode } from '@/lib/webrtc';

export interface UseCall {
  state: CallState;
  incomingMode: CallMode;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasRemote: boolean;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  peerSharing: boolean;
  error: string | null;
  isActive: boolean; // in a call (outgoing/incoming/connecting/connected)
  startCall: (mode: CallMode) => void;
  accept: () => void;
  reject: () => void;
  hangup: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreen: () => void;
  setDevices: (opts: { micId?: string; cameraId?: string }) => void;
}

/** Owns a single CallManager for the session and mirrors its state into React. */
export function useCall(socket: Socket | null): UseCall {
  const managerRef = useRef<CallManager | null>(null);

  const [state, setState] = useState<CallState>('idle');
  const [incomingMode, setIncomingMode] = useState<CallMode>('video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasRemote, setHasRemote] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [peerSharing, setPeerSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const manager = new CallManager(socket, {
      onState: (s) => {
        setState(s);
        if (s === 'idle') {
          setMicOn(true);
          setCamOn(true);
          setSharing(false);
          setPeerSharing(false);
          setHasRemote(false);
        }
      },
      onLocalStream: setLocalStream,
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setHasRemote(!!stream && stream.getTracks().length > 0);
      },
      onIncoming: setIncomingMode,
      onPeerScreen: setPeerSharing,
      onError: (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 4000);
      },
    });
    managerRef.current = manager;
    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [socket]);

  const m = () => managerRef.current;

  return useMemo<UseCall>(
    () => ({
      state,
      incomingMode,
      localStream,
      remoteStream,
      hasRemote,
      micOn,
      camOn,
      sharing,
      peerSharing,
      error,
      isActive: state !== 'idle',
      startCall: (mode) => m()?.startCall(mode),
      accept: () => m()?.accept(),
      reject: () => m()?.reject(),
      hangup: () => m()?.hangup(),
      toggleMic: () => setMicOn(m()?.toggleMic() ?? true),
      toggleCam: () => setCamOn(m()?.toggleCam() ?? true),
      toggleScreen: async () => {
        const mgr = m();
        if (!mgr) return;
        if (sharing) {
          await mgr.stopScreenShare();
          setSharing(false);
        } else {
          const ok = await mgr.startScreenShare();
          setSharing(ok);
        }
      },
      setDevices: (opts) => m()?.setDevices(opts),
    }),
    [state, incomingMode, localStream, remoteStream, hasRemote, micOn, camOn, sharing, peerSharing, error]
  );
}
