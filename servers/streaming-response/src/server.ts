import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
  res.json({ status: "alive", protocol: "streaming-response-service" });
});

app.listen(PORT, () => {
  console.log("🚀 streaming-response-service running on http://localhost:" + PORT);
});
