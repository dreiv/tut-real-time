const appDiv = document.getElementById("app")!;

appDiv.innerHTML = `
  <button id="start-stream">Trigger Stream</button>
  <div id="output" style="margin-top: 20px; border: 1px solid #ccc; padding: 15px; font-family: monospace; white-space: pre-wrap;"></div>
`;

const button = document.getElementById("start-stream")!;
const output = document.getElementById("output")!;

button.addEventListener("click", async () => {
  output.textContent = "";

  try {
    const response = await fetch("/api/stream");

    if (!response.body) {
      throw new Error(
        "Readable streams are unsupported in this client engine.",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      output.textContent += chunkText;
    }

    output.textContent += "\n\n[Stream Completely Processed]";
  } catch (err) {
    output.textContent = `Streaming Error: ${err}`;
  }
});
