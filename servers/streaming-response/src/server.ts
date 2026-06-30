import express from "express";

const app = express();
const PORT = 3001;

app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  const message =
    "This is a raw HTTP response stream running over a Vite proxy!";
  const words = message.split(" ");

  for (const word of words) {
    res.write(word + " ");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  res.end();
});

app.listen(PORT);
