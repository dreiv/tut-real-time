import express from "express";

const app = express();
const PORT = 3002;

app.get("/api/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log("🔌 Client connected to SSE stream.");

  const intervalId = setInterval(() => {
    const metrics = {
      cpu: Math.floor(Math.random() * 40) + 20, // 20% - 60%
      memory: Math.floor(Math.random() * 15) + 70, // 70% - 85%
    };

    // SSE Format requires: "data: <string>\n\n" to flush an event payload
    res.write(`data: ${JSON.stringify(metrics)}\n\n`);
  }, 1000);

  // Clean up memory allocations if the user closes the tab
  req.on("close", () => {
    clearInterval(intervalId);
    console.log("❌ Client disconnected from SSE stream.");
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SSE Service active at http://localhost:${PORT}`);
});
