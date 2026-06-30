import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
  res.json({ status: "alive", protocol: "sse-dashboard-service" });
});

app.listen(PORT, () => {
  console.log("🚀 sse-dashboard-service running on http://localhost:" + PORT);
});
