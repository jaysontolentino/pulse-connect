"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import EntryGate from "./components/EntryGate";
import WorldMap from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import StatusPill from "./components/StatusPill";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import { gateDots, join, leave, poll, sendSignal } from "@/lib/api";
import {
  PeerSession,
  type DescType,
  type MediaFlags,
  type MediaKind,
  type PeerControl,
} from "@/lib/webrtc";
import { GATE_POLL_INTERVAL_MS, POLL_INTERVAL_MS } from "@/lib/presence";
import { useRequestAlert } from "@/lib/use-request-alert";
import { type PeerDot, type SignalMsg, type SignalType } from "@/lib/types";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "incoming"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

type VideoState = "none" | "requesting" | "incoming" | "active";

const REQUEST_TIMEOUT_MS = 30_000;
const TYPING_TIMEOUT_MS = 5_000;
const MEDIA_ON: MediaFlags = { mic: true, camera: true };

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [token, setToken] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const [localMedia, setLocalMedia] = useState<MediaFlags>(MEDIA_ON);
  const [remoteMedia, setRemoteMedia] = useState<MediaFlags>(MEDIA_ON);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
    // The stranger may toggle before our video is active, so remote flags
    // are only reset when a video ends, never when one starts.
    if (v === "none") {
      setLocalMedia(MEDIA_ON);
      setRemoteMedia(MEDIA_ON);
    }
  };

  const peerRef = useRef<PeerSession | null>(null);
  const requestAlert = useRequestAlert();
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function signal(toId: string, type: SignalType, payload?: string) {
    if (token) void sendSignal(token, toId, type, payload);
  }

  function addMessage(mine: boolean, text: string) {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
  }

  function showTyping(on: boolean) {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setStrangerTyping(on);
    if (on) {
      typingTimer.current = setTimeout(() => setStrangerTyping(false), TYPING_TIMEOUT_MS);
    }
  }

  function teardown(message?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    showTyping(false);
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
    setMessages([]);
    setConn({ kind: "idle" });
    if (message) showNotice(message);
  }

  function startPeer(peerId: string, initiator: boolean) {
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        signal(peerId, type, payload);
      },
      onChat: (text) => {
        showTyping(false);
        addMessage(false, text);
      },
      onTyping: () => showTyping(true),
      onControl: (ctrl) => handleControl(ctrl),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionState: (state) => {
        if (state === "failed") {
          dropConnection(ps, "Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        setConn({ kind: "connected", peerId });
      },
      onChannelClose: () => dropConnection(ps, "Stranger disconnected."),
    });
    peerRef.current = ps;
  }

  // The peer may be gone without a leave beacon, so send `end` ourselves to
  // clear our server-side busy flag.
  function dropConnection(ps: PeerSession, message: string) {
    if (peerRef.current !== ps) return;
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      signal(c.peerId, "end");
    }
    teardown(message);
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "none") {
          setVideo("incoming");
          requestAlert.play();
        }
        break;
      case "video-accept":
        if (videoRef.current === "requesting" && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
              setVideo("active");
            })
            .catch(() => {
              setVideo("none");
              ps.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (videoRef.current === "requesting") {
          setVideo("none");
          showNotice("Video declined.");
        }
        break;
      case "video-end":
        ps?.stopVideo();
        setLocalStream(null);
        setVideo("none");
        break;
      case "mic-on":
      case "mic-off":
        setRemoteMedia((m) => ({ ...m, mic: ctrl === "mic-on" }));
        break;
      case "camera-on":
      case "camera-off":
        setRemoteMedia((m) => ({ ...m, camera: ctrl === "camera-on" }));
        break;
    }
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    setConn({ kind: "requesting", peerId });
    signal(peerId, "request");
    requestTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "requesting" &&
        connRef.current.peerId === peerId
      ) {
        signal(peerId, "end");
        teardown("No answer.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelRequest() {
    if (connRef.current.kind === "requesting") {
      signal(connRef.current.peerId, "end");
    }
    teardown();
  }

  function acceptIncoming() {
    if (connRef.current.kind !== "incoming") return;
    const peerId = connRef.current.peerId;
    startPeer(peerId, false);
    signal(peerId, "accept");
    setConn({ kind: "connecting", peerId });
  }

  function declineIncoming() {
    if (connRef.current.kind !== "incoming") return;
    signal(connRef.current.peerId, "decline");
    setConn({ kind: "idle" });
  }

  function endConnection() {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      signal(c.peerId, "end");
    }
    teardown();
  }

  function startVideoRequest() {
    if (videoRef.current !== "none" || !peerRef.current) return;
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
  }

  function acceptVideo() {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo() {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }

  function endVideo() {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setVideo("none");
  }

  function toggleMedia(kind: MediaKind) {
    const ps = peerRef.current;
    if (!ps) return;
    const on = !localMedia[kind];
    ps.setMediaEnabled(kind, on);
    ps.sendControl(`${kind}-${on ? "on" : "off"}` as const);
    setLocalMedia((m) => ({ ...m, [kind]: on }));
  }

  function processSignal(sig: SignalMsg) {
    switch (sig.type) {
      case "request": {
        if (connRef.current.kind === "idle") {
          setConn({ kind: "incoming", peerId: sig.fromId });
          requestAlert.play();
        } else {
          signal(sig.fromId, "decline");
        }
        break;
      }
      case "accept": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          startPeer(sig.fromId, true);
          setConn({ kind: "connecting", peerId: sig.fromId });
        }
        break;
      }
      case "decline": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          teardown("Request declined.");
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        const c = connRef.current;
        const peerId =
          c.kind === "connecting" || c.kind === "connected" ? c.peerId : null;
        if (peerRef.current && peerId === sig.fromId) {
          void peerRef.current.handleSignal(
            sig.type as DescType,
            sig.payload ?? "",
          );
        }
        break;
      }
      case "end": {
        const c = connRef.current;
        if (
          (c.kind === "incoming" ||
            c.kind === "connecting" ||
            c.kind === "connected") &&
          c.peerId === sig.fromId
        ) {
          if (c.kind === "incoming") setConn({ kind: "idle" });
          else teardown("Stranger disconnected.");
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  // Before joining, the gate shows who is online from the id-free /api/dots,
  // and more slowly: every visitor polls there, including those who never
  // enter. Joined sessions poll with their token.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        if (token) {
          const data = await poll(token);
          if (!active) return;
          setPeers(data.peers);
          for (const s of data.signals) processSignalRef.current(s);
        } else {
          const dots = await gateDots();
          if (active) setPeers(dots);
        }
      } catch {}
      if (active) {
        timer = setTimeout(tick, token ? POLL_INTERVAL_MS : GATE_POLL_INTERVAL_MS);
      }
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    if (!token || phase !== "live") return;
    const onLeave = () => leave(token);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [token, phase]);

  async function handleReady(lat: number, lng: number) {
    setMyLocation({ lat, lng });
    try {
      setToken(await join(lat, lng));
      setPhase("live");
    } catch (err) {
      setMyLocation(null);
      throw err;
    }
  }

  const inChat = conn.kind === "connecting" || conn.kind === "connected";

  const hasStatus = Boolean(notice) || conn.kind === "requesting" || video === "requesting";
  const status: ReactNode = hasStatus && (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      {notice && <StatusPill>{notice}</StatusPill>}
      {conn.kind === "requesting" && (
        <StatusPill pending action={{ label: "Cancel", onClick: cancelRequest }}>
          Requesting connection…
        </StatusPill>
      )}
      {video === "requesting" && (
        <StatusPill pending>Waiting for stranger to accept video…</StatusPill>
      )}
    </div>
  );

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={peers}
        me={myLocation}
        onPeerClick={requestConnection}
        canConnect={phase === "live" && conn.kind === "idle"}
      />

      {phase === "gate" && (
        <EntryGate
          onEnter={requestAlert.unlock}
          onReady={handleReady}
          leaving={myLocation !== null}
        />
      )}

      {!inChat && hasStatus && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-30 flex justify-center px-4">
          {status}
        </div>
      )}

      {conn.kind === "incoming" && (
        <ConnectionPrompt
          icon="connect"
          title="A stranger wants to connect"
          subtitle="Accept to start an anonymous chat."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {inChat && (
        <ChatPanel
          messages={messages}
          connected={conn.kind === "connected"}
          videoBusy={video !== "none"}
          strangerTyping={strangerTyping}
          onTyping={() => peerRef.current?.sendTyping()}
          onSend={(text) => {
            peerRef.current?.sendChat(text);
            addMessage(true, text);
          }}
          onStartVideo={startVideoRequest}
          onEnd={endConnection}
          status={status}
        />
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          icon="video"
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          localMedia={localMedia}
          remoteMedia={remoteMedia}
          onToggleMedia={toggleMedia}
          onEnd={endVideo}
        />
      )}
    </main>
  );
}
