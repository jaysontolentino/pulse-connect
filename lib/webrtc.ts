export type DescType = "offer" | "answer" | "ice";
export type MediaKind = "mic" | "camera";
export type MediaFlags = Record<MediaKind, boolean>;
export type PeerControl =
  | "video-request"
  | "video-accept"
  | "video-decline"
  | "video-end"
  | `${MediaKind}-${"on" | "off"}`;

interface PeerCallbacks {
  onSignal: (type: DescType, payload: string) => void;
  onChat: (text: string) => void;
  onTyping: () => void;
  onControl: (ctrl: PeerControl) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onChannelOpen: () => void;
  onChannelClose: () => void;
}

const TYPING_SEND_INTERVAL_MS = 3_000;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class PeerSession {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private readonly polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStream: MediaStream | null = null;
  private readonly remoteStream = new MediaStream();
  private closed = false;
  private readonly cb: PeerCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private lastTypingAt = 0;

  constructor(initiator: boolean, cb: PeerCallbacks) {
    this.cb = cb;
    this.polite = !initiator;
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.cb.onSignal("ice", JSON.stringify(candidate));
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          this.cb.onSignal("offer", JSON.stringify(this.pc.localDescription));
        }
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = ({ track }) => {
      this.remoteStream.addTrack(track);
      this.cb.onRemoteStream(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      this.cb.onConnectionState(this.pc.connectionState);
    };

    // Media slots are negotiated up front, and video only swaps tracks in
    // and out of them. Adding tracks mid-call made both sides renegotiate at
    // once, and the losing side's tracks were never negotiated.
    if (initiator) {
      this.pc.addTransceiver("audio", { direction: "sendrecv" });
      this.pc.addTransceiver("video", { direction: "sendrecv" });
      this.dc = this.pc.createDataChannel("chat");
      this.wireDataChannel(this.dc);
    } else {
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.wireDataChannel(this.dc);
      };
    }
  }

  private wireDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => this.cb.onChannelOpen();
    // close() also fires this, so only report a close the remote side caused.
    dc.onclose = () => {
      if (!this.closed) this.cb.onChannelClose();
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.t === "chat" && typeof msg.text === "string") {
          this.cb.onChat(msg.text);
        } else if (msg.t === "typing") {
          this.cb.onTyping();
        } else if (msg.t === "ctrl" && typeof msg.ctrl === "string") {
          this.cb.onControl(msg.ctrl as PeerControl);
        }
      } catch {}
    };
  }

  async handleSignal(type: DescType, payload: string) {
    if (this.closed) return;
    const data = JSON.parse(payload);

    if (type === "ice") {
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(data);
        return;
      }
      try {
        await this.pc.addIceCandidate(data);
      } catch {}
      return;
    }

    const desc = data as RTCSessionDescriptionInit;
    const offerCollision =
      desc.type === "offer" &&
      (this.makingOffer || this.pc.signalingState !== "stable");
    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.pc.setRemoteDescription(desc);
    await this.flushPendingCandidates();
    if (desc.type === "offer") {
      // Transceivers created from a remote offer start recvonly.
      for (const t of this.pc.getTransceivers()) {
        if (t.direction === "recvonly") t.direction = "sendrecv";
      }
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        this.cb.onSignal("answer", JSON.stringify(this.pc.localDescription));
      }
    }
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
  }

  sendChat(text: string) {
    this.safeSend({ t: "chat", text });
    // The receiver hides the indicator on each message, so the next
    // keystroke should be able to show it again at once.
    this.lastTypingAt = 0;
  }

  sendTyping() {
    const now = Date.now();
    if (now - this.lastTypingAt < TYPING_SEND_INTERVAL_MS) return;
    this.lastTypingAt = now;
    this.safeSend({ t: "typing" });
  }

  sendControl(ctrl: PeerControl) {
    this.safeSend({ t: "ctrl", ctrl });
  }

  private safeSend(obj: unknown) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(obj));
    }
  }

  async startVideo(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      for (const track of this.localStream.getTracks()) {
        await this.senderFor(track.kind)?.replaceTrack(track);
      }
    }
    return this.localStream;
  }

  // A disabled track keeps its slot and sends silence or black frames, so
  // toggling never renegotiates.
  setMediaEnabled(kind: MediaKind, enabled: boolean) {
    const tracks =
      kind === "mic"
        ? this.localStream?.getAudioTracks()
        : this.localStream?.getVideoTracks();
    for (const track of tracks ?? []) track.enabled = enabled;
  }

  stopVideo() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
        void this.senderFor(track.kind)?.replaceTrack(null).catch(() => {});
      }
      this.localStream = null;
    }
  }

  private senderFor(kind: string): RTCRtpSender | undefined {
    return this.pc
      .getTransceivers()
      .find((t) => t.receiver.track.kind === kind)?.sender;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopVideo();
    if (this.dc) {
      try {
        this.dc.close();
      } catch {}
    }
    try {
      this.pc.close();
    } catch {}
  }
}
