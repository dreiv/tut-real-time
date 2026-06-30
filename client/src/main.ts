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
