// ============================================================================
// 1. LABS COMPONENT NAVIGATION REGISTRATION
// ============================================================================
const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const panels = document.querySelectorAll<HTMLElement>(".panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-target")!;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(targetId)?.classList.add("active");
  });
});

// ============================================================================
// 2. PROTOCOL LAB 1: RAW HTTP CHUNKED STREAMING
// ============================================================================
const startStreamBtn = document.getElementById("start-stream")!;
const streamOutput = document.getElementById("stream-output")!;

startStreamBtn.addEventListener("click", async () => {
  streamOutput.textContent = "Opening connection socket context...";

  try {
    const response = await fetch("/api/stream");
    if (!response.body) throw new Error("No readable stream response found.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    streamOutput.textContent = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      streamOutput.textContent += chunkText;
    }

    streamOutput.textContent += "\n\n[Finished Processing Buffer Chunks]";
  } catch (err) {
    streamOutput.textContent = `Streaming Error: ${err}`;
  }
});

// ============================================================================
// 3. PROTOCOL LAB 2: SERVER-SENT EVENTS (SSE)
// ============================================================================
const cpuMetric = document.getElementById("cpu-metric")!;
const memMetric = document.getElementById("mem-metric")!;
const connectSseBtn = document.getElementById("connect-sse")!;
const disconnectSseBtn = document.getElementById("disconnect-sse")!;

let currentEventSource: EventSource | null = null;

function connectSSE() {
  if (currentEventSource) return;

  currentEventSource = new EventSource("/api/sse");
  cpuMetric.textContent = "WAITING...";
  memMetric.textContent = "WAITING...";

  currentEventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    cpuMetric.textContent = `${data.cpu}%`;
    memMetric.textContent = `${data.memory}%`;
  };

  currentEventSource.onerror = () => {
    console.error("SSE Connection dropped or error encountered.");
    disconnectSSE();
    cpuMetric.textContent = "ERROR";
    memMetric.textContent = "ERROR";
  };
}

function disconnectSSE() {
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
    cpuMetric.textContent = "--";
    memMetric.textContent = "--";
    console.log("🔒 EventSource closed safely.");
  }
}

connectSseBtn.addEventListener("click", connectSSE);
disconnectSseBtn.addEventListener("click", disconnectSSE);

// ============================================================================
// 4. PROTOCOL LAB 3: BI-DIRECTIONAL WEBSOCKETS
// ============================================================================
const wsConnectBtn = document.getElementById(
  "ws-connect-btn",
) as HTMLButtonElement;
const wsDisconnectBtn = document.getElementById(
  "ws-disconnect-btn",
) as HTMLButtonElement;
const wsUsernameInput = document.getElementById(
  "ws-username",
) as HTMLInputElement;
const chatBox = document.getElementById("chat-box")!;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const chatSendBtn = document.getElementById(
  "chat-send-btn",
) as HTMLButtonElement;

let socket: WebSocket | null = null;

function appendChatMessage(user: string, text: string) {
  const msgDiv = document.createElement("div");
  msgDiv.innerHTML = `<strong>[${user}]:</strong> <span></span>`;
  msgDiv.querySelector("span")!.textContent = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

wsConnectBtn.addEventListener("click", () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    wsConnectBtn.disabled = true;
    wsDisconnectBtn.disabled = false;
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatBox.innerHTML = "";
    appendChatMessage("System", "WebSocket channel opened successfully.");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    appendChatMessage(data.user, data.text);
  };

  socket.onclose = () => {
    wsConnectBtn.disabled = false;
    wsDisconnectBtn.disabled = true;
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    appendChatMessage("System", "WebSocket channel closed safely.");
    socket = null;
  };

  socket.onerror = (err) => {
    console.error("WebSocket transport level parsing error:", err);
  };
});

wsDisconnectBtn.addEventListener("click", () => {
  socket?.close();
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  const payload = { user: wsUsernameInput.value || "Anonymous", text };
  socket.send(JSON.stringify(payload));
  chatInput.value = "";
  chatInput.focus();
});

// ============================================================================
// 5. PROTOCOL LAB 4: PEER-TO-PEER WEBRTC
// ============================================================================
const rtcConnectSignalingBtn = document.getElementById(
  "rtc-connect-signaling",
) as HTMLButtonElement;
const rtcInitiateP2PBtn = document.getElementById(
  "rtc-initiate-p2p",
) as HTMLButtonElement;
const rtcDisconnectBtn = document.getElementById(
  "rtc-disconnect-btn",
) as HTMLButtonElement;
const rtcBox = document.getElementById("rtc-box")!;
const rtcForm = document.getElementById("rtc-form") as HTMLFormElement;
const rtcInput = document.getElementById("rtc-input") as HTMLInputElement;
const rtcSendBtn = document.getElementById("rtc-send-btn") as HTMLButtonElement;

let signalingSocket: WebSocket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

// --- UI HELPERS ---
function appendRtcLog(sender: string, text: string) {
  const msgDiv = document.createElement("div");
  msgDiv.innerHTML = `<strong>[${sender}]:</strong> <span>${text}</span>`;
  rtcBox.appendChild(msgDiv);
  rtcBox.scrollTop = rtcBox.scrollHeight;
}

function setRtcUIState(phase: "disconnected" | "signaling" | "connected") {
  rtcConnectSignalingBtn.disabled = phase !== "disconnected";
  rtcInitiateP2PBtn.disabled = phase !== "signaling";
  rtcDisconnectBtn.disabled = phase === "disconnected";
  rtcInput.disabled = phase !== "connected";
  rtcSendBtn.disabled = phase !== "connected";
}

// --- 1. SIGNALING HANDSHAKE ---
rtcConnectSignalingBtn.addEventListener("click", () => {
  // Assuming your standalone signaling server is now bound to 3004
  signalingSocket = new WebSocket(`ws://localhost:3004`);
  appendRtcLog("Signaling", "Connecting to socket relay...");

  signalingSocket.onopen = () => {
    setRtcUIState("signaling");
    appendRtcLog("Signaling", "Ready. Open another tab.");
    initializePeerConnection();
  };

  signalingSocket.onmessage = async (event) => {
    const { rtc } = JSON.parse(event.data);
    if (!rtc || !peerConnection) return;

    try {
      if (rtc.sdp) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(rtc.sdp),
        );
        if (rtc.sdp.type === "offer") {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          signalingSocket?.send(
            JSON.stringify({ rtc: { sdp: peerConnection.localDescription } }),
          );
        }
      } else if (rtc.candidate) {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(rtc.candidate),
        );
      }
    } catch (err) {
      console.error("Signaling error:", err);
    }
  };

  signalingSocket.onclose = teardownRTC;
});

// --- 2. WEBRTC ENGINE ---
function initializePeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peerConnection.onicecandidate = (e) => {
    if (e.candidate)
      signalingSocket?.send(
        JSON.stringify({ rtc: { candidate: e.candidate } }),
      );
  };

  peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel;
    setupDataChannelListeners();
  };
}

rtcInitiateP2PBtn.addEventListener("click", async () => {
  if (!peerConnection) return;
  setRtcUIState("disconnected"); // Temp disable while negotiating

  dataChannel = peerConnection.createDataChannel("lab-text-pipe");
  setupDataChannelListeners();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingSocket?.send(
    JSON.stringify({ rtc: { sdp: peerConnection.localDescription } }),
  );
});

// --- 3. DATA CHANNEL P2P ---
function setupDataChannelListeners() {
  if (!dataChannel) return;

  dataChannel.onopen = () => {
    setRtcUIState("connected");
    appendRtcLog("WebRTC P2P", "🚀 DIRECT CONNECTION OPENED!");
  };

  dataChannel.onmessage = (e) => appendRtcLog("Remote Peer", e.data);
  dataChannel.onclose = teardownRTC;
}

// --- 4. CHAT & TEARDOWN ---
rtcForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = rtcInput.value.trim();
  if (!text || dataChannel?.readyState !== "open") return;

  dataChannel.send(text);
  appendRtcLog("You (P2P)", text);
  rtcInput.value = "";
});

rtcDisconnectBtn.addEventListener("click", teardownRTC);

function teardownRTC() {
  dataChannel?.close();
  peerConnection?.close();
  signalingSocket?.close();

  dataChannel = null;
  peerConnection = null;
  signalingSocket = null;

  setRtcUIState("disconnected");
  appendRtcLog("System", "All connections closed.");
}
