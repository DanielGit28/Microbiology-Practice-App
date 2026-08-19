import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const MODEL = "claude-sonnet-4-6";

app.post("/api/generate", async (req, res) => {
  const { system, user } = req.body || {};

  if (!user) {
    return res.status(400).json({ error: 'Falta el campo "user" en el body.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta ANTHROPIC_API_KEY en el servidor. Revisa server/.env (copia .env.example)." });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "Error de la API de Anthropic." });
    }

    const text = (data.content || []).map((b) => b.text || "").join("\n");
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error inesperado en el servidor." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de Incubadora escuchando en http://localhost:${PORT}`);
});
