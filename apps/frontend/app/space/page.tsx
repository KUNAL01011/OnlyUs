'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone, LogOut, Loader2, Settings } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { api, type Session, type Profile } from '@/lib/api';
import { Chat } from '@/components/Chat';
import { CallPanel } from '@/components/CallPanel';
import { FloatingCall } from '@/components/FloatingCall';
import { PresenceDot } from '@/components/PresenceDot';
import { Avatar } from '@/components/Avatar';
import { ProfileDialog } from '@/components/ProfileDialog';
import { DeviceSettings } from '@/components/DeviceSettings';
import { useCall } from '@/hooks/useCall';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { cn } from '@/lib/utils';

type Tab = 'chat' | 'call';

export default function SpacePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [roomFull, setRoomFull] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const [loading, setLoading] = useState(true);

  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [peerProfile, setPeerProfile] = useState<Profile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showDevices, setShowDevices] = useState(false);

  const call = useCall(socket);
  const devices = useMediaDevices();

  const peerName = peerProfile?.name || 'Friend';

  // Push the user's chosen mic/camera into the call (switches live if in a call).
  useEffect(() => {
    call.setDevices({ micId: devices.micId, cameraId: devices.cameraId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.micId, devices.cameraId]);

  useEffect(() => {
    let mounted = true;

    api
      .me()
      .then(async (me) => {
        if (!mounted) return;
        const sess = { roomId: me.roomId, slot: me.slot, name: me.name };
        setSession(sess);

        // Load both profiles (own + peer) in parallel.
        const [mine, peer] = await Promise.all([
          api.myProfile().then((r) => r.profile).catch(() => null),
          api.peerProfile().then((r) => r.profile).catch(() => null),
        ]);
        if (!mounted) return;
        setMyProfile(mine);
        setPeerProfile(peer);

        const s = getSocket();
        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));

        s.on('presence:update', ({ online }: { online: Array<'a' | 'b'> }) => {
          setPeerOnline(online.some((slot) => slot !== me.slot));
        });

        s.on('room:full', ({ message }: { message: string }) => setRoomFull(message));
        s.on('call:invite', () => setTab('call'));

        // Live profile edits from either side.
        s.on('profile:update', (p: Profile) => {
          if (p.slot === me.slot) setMyProfile(p);
          else setPeerProfile(p);
        });

        s.connect();
        setSocket(s);
        setLoading(false);
      })
      .catch(() => router.replace('/'));

    return () => {
      mounted = false;
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function leave() {
    await api.leave().catch(() => {});
    disconnectSocket();
    router.replace('/');
  }

  if (roomFull) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8">
          <p className="text-4xl">🔒</p>
          <h2 className="mt-4 text-xl font-semibold">Only Us is full</h2>
          <p className="mt-2 text-sm text-muted-foreground">{roomFull}</p>
        </div>
      </div>
    );
  }

  if (loading || !session || !socket) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const myName = myProfile?.name || session.name;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card/70 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-base font-bold sm:text-lg">
            Only <span className="text-primary">Us</span>
          </span>
          <PresenceDot
            online={connected}
            label={connected ? 'Connected' : 'Reconnecting…'}
            className="hidden sm:flex"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Peer */}
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={peerName} avatar={peerProfile?.avatar} size={32} className="shrink-0" />
            <div className="hidden max-w-[9rem] leading-tight md:block">
              <p className="truncate text-sm font-medium">{peerName}</p>
              <PresenceDot online={peerOnline} label={peerOnline ? 'online' : 'offline'} className="text-xs" />
            </div>
          </div>

          <div className="mx-0.5 h-6 w-px shrink-0 bg-border sm:mx-1" />

          {/* Me */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-muted sm:pr-2"
            title="Edit your profile"
          >
            <Avatar name={myName} avatar={myProfile?.avatar} size={32} className="shrink-0" />
            <Settings className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          <button
            onClick={leave}
            className="flex shrink-0 items-center gap-1.5 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2.5"
            title="Leave"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Main — split on desktop, tabbed on mobile */}
      <main className="min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <section
          className={cn(
            'h-full min-h-0 border-border lg:block lg:border-r',
            tab === 'call' ? 'block' : 'hidden'
          )}
        >
          <CallPanel
            call={call}
            peerName={peerName}
            peerAvatar={peerProfile?.avatar}
            peerOnline={peerOnline}
            speakerId={devices.speakerId}
            onOpenDevices={() => setShowDevices(true)}
          />
        </section>

        <section className={cn('h-full min-h-0 lg:block', tab === 'chat' ? 'block' : 'hidden')}>
          <Chat socket={socket} session={session} />
        </section>
      </main>

      {/* Mobile tab bar */}
      <nav className="flex border-t border-border bg-card lg:hidden">
        <TabButton
          active={tab === 'chat'}
          onClick={() => setTab('chat')}
          icon={<MessageCircle className="h-5 w-5" />}
          label="Chat"
        />
        <TabButton
          active={tab === 'call'}
          onClick={() => setTab('call')}
          icon={<Phone className="h-5 w-5" />}
          label="Call"
          badge={call.isActive}
        />
      </nav>

      {/* Mobile: floating call window so you can watch + chat at once */}
      {call.isActive && tab === 'chat' && (
        <FloatingCall
          call={call}
          peerName={peerName}
          peerAvatar={peerProfile?.avatar}
          onExpand={() => setTab('call')}
        />
      )}

      {showProfile && myProfile && (
        <ProfileDialog
          profile={myProfile}
          onClose={() => setShowProfile(false)}
          onSaved={setMyProfile}
        />
      )}

      {showDevices && <DeviceSettings devices={devices} onClose={() => setShowDevices(false)} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -right-1.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-card" />
        )}
      </span>
      {label}
    </button>
  );
}
