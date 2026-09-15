'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone, LogOut, Loader2, Settings } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { api, type Session, type Profile } from '@/lib/api';
import { Chat } from '@/components/Chat';
import { CallPanel } from '@/components/CallPanel';
import { PresenceDot } from '@/components/PresenceDot';
import { Avatar } from '@/components/Avatar';
import { ProfileDialog } from '@/components/ProfileDialog';
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

  const peerName = peerProfile?.name || 'Friend';

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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">
            Only <span className="text-primary">Us</span>
          </span>
          <PresenceDot
            online={connected}
            label={connected ? 'Connected' : 'Reconnecting…'}
            className="ml-1 hidden sm:flex"
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Peer */}
          <div className="flex items-center gap-2">
            <Avatar name={peerName} avatar={peerProfile?.avatar} size={32} />
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{peerName}</p>
              <PresenceDot online={peerOnline} label={peerOnline ? 'online' : 'offline'} className="text-xs" />
            </div>
          </div>

          <div className="mx-1 h-6 w-px bg-border" />

          {/* Me */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted"
            title="Edit your profile"
          >
            <Avatar name={myName} avatar={myProfile?.avatar} size={32} />
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={leave}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Main — split on desktop, tabbed on mobile */}
      <main className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]">
        <section
          className={cn(
            'h-full min-h-0 border-border lg:block lg:border-r',
            tab === 'call' ? 'block' : 'hidden'
          )}
        >
          <CallPanel
            socket={socket}
            peerName={peerName}
            peerAvatar={peerProfile?.avatar}
            peerOnline={peerOnline}
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
        />
      </nav>

      {showProfile && myProfile && (
        <ProfileDialog
          profile={myProfile}
          onClose={() => setShowProfile(false)}
          onSaved={setMyProfile}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
