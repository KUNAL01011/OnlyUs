'use client';

import { useCallback, useEffect, useState } from 'react';

const LS = {
  mic: 'onlyus.device.mic',
  camera: 'onlyus.device.camera',
  speaker: 'onlyus.device.speaker',
};

function load(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export interface MediaDevicesState {
  mics: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
  micId: string;
  cameraId: string;
  speakerId: string;
  hasLabels: boolean;
  speakerSelectionSupported: boolean;
  setMic: (id: string) => void;
  setCamera: (id: string) => void;
  setSpeaker: (id: string) => void;
  refresh: () => Promise<void>;
  ensureLabels: () => Promise<void>;
}

export function useMediaDevices(): MediaDevicesState {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [speakerId, setSpeakerId] = useState('');
  const [hasLabels, setHasLabels] = useState(false);

  const speakerSelectionSupported =
    typeof window !== 'undefined' &&
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype;

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioIn = devices.filter((d) => d.kind === 'audioinput');
    const videoIn = devices.filter((d) => d.kind === 'videoinput');
    const audioOut = devices.filter((d) => d.kind === 'audiooutput');
    setMics(audioIn);
    setCameras(videoIn);
    setSpeakers(audioOut);
    setHasLabels(devices.some((d) => d.label !== ''));
  }, []);

  const ensureLabels = useCallback(async () => {
    // Device labels are only exposed after the user grants permission once.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* permission denied — labels stay generic */
      }
    }
    await refresh();
  }, [refresh]);

  // Load saved selections + initial enumeration; react to device plug/unplug.
  useEffect(() => {
    setMicId(load(LS.mic));
    setCameraId(load(LS.camera));
    setSpeakerId(load(LS.speaker));
    refresh();

    const handler = () => refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
  }, [refresh]);

  const setMic = useCallback((id: string) => {
    setMicId(id);
    save(LS.mic, id);
  }, []);
  const setCamera = useCallback((id: string) => {
    setCameraId(id);
    save(LS.camera, id);
  }, []);
  const setSpeaker = useCallback((id: string) => {
    setSpeakerId(id);
    save(LS.speaker, id);
  }, []);

  return {
    mics,
    cameras,
    speakers,
    micId,
    cameraId,
    speakerId,
    hasLabels,
    speakerSelectionSupported,
    setMic,
    setCamera,
    setSpeaker,
    refresh,
    ensureLabels,
  };
}
