export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL;

const GIPHY_PUBLIC_BETA = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
export const GIPHY_KEY =
  process.env.NEXT_PUBLIC_GIPHY_KEY || GIPHY_PUBLIC_BETA;

/** Build the RTCConfiguration from environment variables. */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stun = (process.env.NEXT_PUBLIC_STUN_URLS ??
    'stun:stun.l.google.com:19302')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (stun.length) servers.push({ urls: stun });

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}
