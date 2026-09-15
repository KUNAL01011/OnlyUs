import type { Socket } from 'socket.io-client';
import { getIceServers } from './config';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';
export type CallMode = 'audio' | 'video';

export interface CallManagerEvents {
  onState?: (s: CallState) => void;
  onLocalStream?: (s: MediaStream | null) => void;
  onRemoteStream?: (s: MediaStream | null) => void;
  onIncoming?: (mode: CallMode) => void;
  onPeerScreen?: (sharing: boolean) => void;
  onError?: (msg: string) => void;
}

/**
 * Owns the RTCPeerConnection and all media for a 1-to-1 call.
 * The Socket.IO connection is used ONLY for signaling (SDP + ICE + call state).
 * Media never touches the server — it flows peer-to-peer over WebRTC.
 */
export class CallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaVideoTrack | null = null; // saved while screen-sharing
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isCaller = false;
  private mode: CallMode = 'video';
  private _state: CallState = 'idle';
  private sharing = false;

  // Preferred input devices (deviceId from enumerateDevices). Empty = system default.
  private micId = '';
  private cameraId = '';

  constructor(
    private socket: Socket,
    private events: CallManagerEvents = {}
  ) {
    this.bindSignaling();
  }

  get state() {
    return this._state;
  }
  get isSharing() {
    return this.sharing;
  }

  private setState(s: CallState) {
    this._state = s;
    this.events.onState?.(s);
  }

  // ───────────────────────────── Signaling ─────────────────────────────
  private bindSignaling() {
    this.socket.on('call:invite', ({ mode }: { mode: CallMode }) => {
      if (this._state !== 'idle') {
        this.socket.emit('call:reject');
        return;
      }
      this.mode = mode;
      this.isCaller = false;
      this.setState('incoming');
      this.events.onIncoming?.(mode);
    });

    this.socket.on('call:accept', async () => {
      // We are the caller and the peer accepted — send the offer.
      if (this.isCaller) {
        await this.makeOffer();
      }
    });

    this.socket.on('call:reject', () => {
      this.events.onError?.('Call declined.');
      this.cleanup();
    });

    this.socket.on('call:end', () => {
      this.cleanup();
    });

    this.socket.on('webrtc:offer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await this.handleOffer(sdp);
    });

    this.socket.on('webrtc:answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.pc) return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.drainCandidates();
    });

    this.socket.on('webrtc:ice', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      if (this.pc?.remoteDescription) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore */
        }
      } else {
        this.pendingCandidates.push(candidate);
      }
    });

    this.socket.on('screen:state', ({ sharing }: { sharing: boolean }) => {
      this.events.onPeerScreen?.(sharing);
    });
  }

  private async drainCandidates() {
    if (!this.pc) return;
    for (const c of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
    this.pendingCandidates = [];
  }

  // ───────────────────────────── Media setup ───────────────────────────
  /** Remember preferred devices. Switches live if a call is already running. */
  async setDevices(opts: { micId?: string; cameraId?: string }) {
    if (opts.micId !== undefined && opts.micId !== this.micId) {
      this.micId = opts.micId;
      if (this.localStream?.getAudioTracks().length) await this.switchAudio();
    }
    if (opts.cameraId !== undefined && opts.cameraId !== this.cameraId) {
      this.cameraId = opts.cameraId;
      if (!this.sharing && this.localStream?.getVideoTracks().length) await this.switchVideo();
    }
  }

  private audioConstraint(): MediaTrackConstraints | boolean {
    return this.micId
      ? { deviceId: { exact: this.micId }, echoCancellation: true, noiseSuppression: true }
      : { echoCancellation: true, noiseSuppression: true };
  }

  private videoConstraint(): MediaTrackConstraints {
    const base: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
    if (this.cameraId) base.deviceId = { exact: this.cameraId };
    return base;
  }

  private async getMedia(mode: CallMode): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: this.audioConstraint(),
      video: mode === 'video' ? this.videoConstraint() : false,
    };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // A saved device may have been unplugged — retry with system defaults.
      if ((err as DOMException)?.name === 'OverconstrainedError') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === 'video',
        });
      } else {
        throw err;
      }
    }
    this.localStream = stream;
    this.cameraTrack = (stream.getVideoTracks()[0] as MediaVideoTrack) ?? null;
    this.events.onLocalStream?.(stream);
    return stream;
  }

  /** Swap the live microphone track to the currently preferred device. */
  private async switchAudio() {
    if (!this.localStream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: this.audioConstraint() });
      const track = s.getAudioTracks()[0];
      const old = this.localStream.getAudioTracks()[0];
      const wasMuted = old ? !old.enabled : false;
      track.enabled = !wasMuted;
      if (old) {
        old.stop();
        this.localStream.removeTrack(old);
      }
      this.localStream.addTrack(track);
      const sender = this.pc?.getSenders().find((x) => x.track?.kind === 'audio');
      if (sender) await sender.replaceTrack(track);
      this.events.onLocalStream?.(this.localStream);
    } catch {
      this.events.onError?.('Could not switch microphone.');
    }
  }

  /** Swap the live camera track to the currently preferred device. */
  private async switchVideo() {
    if (!this.localStream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: this.videoConstraint() });
      const track = s.getVideoTracks()[0] as MediaVideoTrack;
      const old = this.localStream.getVideoTracks()[0];
      const wasOff = old ? !old.enabled : false;
      track.enabled = !wasOff;
      if (old) {
        old.stop();
        this.localStream.removeTrack(old);
      }
      this.localStream.addTrack(track);
      this.cameraTrack = track;
      const sender = this.pc?.getSenders().find((x) => x.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track);
      this.events.onLocalStream?.(this.localStream);
    } catch {
      this.events.onError?.('Could not switch camera.');
    }
  }

  private createPeer() {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    pc.onicecandidate = (e) => {
      if (e.candidate) this.socket.emit('webrtc:ice', { candidate: e.candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.events.onRemoteStream?.(this.remoteStream);
      }
      this.remoteStream.addTrack(e.track);
      // Notify again so the UI re-attaches when a track arrives.
      this.events.onRemoteStream?.(this.remoteStream);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') this.setState('connected');
      if (s === 'failed' || s === 'closed' || s === 'disconnected') {
        if (this._state !== 'idle') this.cleanup();
      }
    };

    this.pc = pc;
    return pc;
  }

  private addLocalTracks() {
    if (!this.pc || !this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream);
    }
  }

  // ───────────────────────────── Public API ────────────────────────────
  async startCall(mode: CallMode) {
    if (this._state !== 'idle') return;
    try {
      this.mode = mode;
      this.isCaller = true;
      await this.getMedia(mode);
      this.setState('outgoing');
      this.socket.emit('call:invite', { mode });
    } catch (err) {
      this.events.onError?.(mediaError(err));
      this.cleanup();
    }
  }

  async accept() {
    if (this._state !== 'incoming') return;
    try {
      await this.getMedia(this.mode);
      this.setState('connecting');
      this.socket.emit('call:accept');
      // The caller will now send us an offer.
    } catch (err) {
      this.events.onError?.(mediaError(err));
      this.reject();
    }
  }

  reject() {
    this.socket.emit('call:reject');
    this.cleanup();
  }

  hangup() {
    this.socket.emit('call:end');
    this.cleanup();
  }

  private async makeOffer() {
    this.setState('connecting');
    this.createPeer();
    this.addLocalTracks();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.socket.emit('webrtc:offer', { sdp: offer });
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit) {
    if (!this.pc) {
      this.createPeer();
      this.addLocalTracks();
    }
    await this.pc!.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.drainCandidates();
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    this.socket.emit('webrtc:answer', { sdp: answer });
  }

  // ── Mic / camera toggles ──
  toggleMic(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  toggleCam(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  // ── Screen sharing (replaceTrack keeps the same connection) ──
  async startScreenShare(): Promise<boolean> {
    if (!this.pc) return false;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);

      // Reflect the screen locally in place of the camera.
      if (this.localStream) {
        const oldVideo = this.localStream.getVideoTracks()[0];
        if (oldVideo) this.localStream.removeTrack(oldVideo);
        this.localStream.addTrack(screenTrack);
        this.events.onLocalStream?.(this.localStream);
      }

      screenTrack.onended = () => this.stopScreenShare();
      this.sharing = true;
      this.socket.emit('screen:state', { sharing: true });
      return true;
    } catch (err) {
      this.events.onError?.('Could not start screen share.');
      return false;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.pc || !this.sharing) return;
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');

    // Restore the camera track if we still have it (or grab a fresh one).
    let camTrack = this.cameraTrack;
    if (!camTrack || camTrack.readyState === 'ended') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        camTrack = s.getVideoTracks()[0] as MediaVideoTrack;
      } catch {
        camTrack = null;
      }
    }

    if (sender && camTrack) await sender.replaceTrack(camTrack);

    if (this.localStream) {
      const current = this.localStream.getVideoTracks()[0];
      if (current) this.localStream.removeTrack(current);
      if (camTrack) this.localStream.addTrack(camTrack);
      this.events.onLocalStream?.(this.localStream);
    }

    this.sharing = false;
    this.socket.emit('screen:state', { sharing: false });
  }

  // ───────────────────────────── Teardown ──────────────────────────────
  cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
    }
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.cameraTrack = null;
    this.pendingCandidates = [];
    this.isCaller = false;
    this.sharing = false;
    this.events.onLocalStream?.(null);
    this.events.onRemoteStream?.(null);
    this.setState('idle');
  }

  destroy() {
    this.socket.off('call:invite');
    this.socket.off('call:accept');
    this.socket.off('call:reject');
    this.socket.off('call:end');
    this.socket.off('webrtc:offer');
    this.socket.off('webrtc:answer');
    this.socket.off('webrtc:ice');
    this.socket.off('screen:state');
    this.cleanup();
  }
}

// Small alias so we can annotate saved camera tracks clearly.
type MediaVideoTrack = MediaStreamTrack;

function mediaError(err: unknown): string {
  const e = err as DOMException;
  if (e?.name === 'NotAllowedError')
    return 'Camera / microphone permission was denied.';
  if (e?.name === 'NotFoundError') return 'No camera or microphone found.';
  return 'Could not access your camera or microphone.';
}
