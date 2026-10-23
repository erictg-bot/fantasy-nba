import express from "express";
import cors from "cors";
import { supabase } from "./supabase.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const espnBase = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const cache = new Map<string, { expires: number; body: unknown }>();
const CACHE_MS = Math.max(10_000, Number(process.env.ESPN_CACHE_MS || 30_000));

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "100kb" }));

async function cachedJson(key: string, url: string) {
  const old = cache.get(key);
  if (old && old.expires > Date.now()) return old.body;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FantasyNBA/0.4 (stats adapter)" }
    });
    if (!response.ok) throw new Error(`Upstream ESPN respondió ${response.status}`);
    const body: unknown = await response.json();
    cache.set(key, { expires: Date.now() + CACHE_MS, body });
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "fantasy-nba-stats-adapter" }));
app.get("/health/supabase", async (_req, res) => {
  const { error } = await supabase
    .from("leagues")
    .select("id")
    .limit(1);

  if (error) {
    return res.status(503).json({
      ok: false,
      service: "supabase",
      error: "No se pudo consultar la tabla leagues"
    });
  }

  return res.json({ ok: true, service: "supabase" });
});

app.get("/api/nba/scoreboard", async (req, res) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10).replaceAll("-", ""));
  if (!/^\d{8}$/.test(date)) return res.status(400).json({ error: "date debe tener formato YYYYMMDD" });
  try {
    const data = await cachedJson(`scoreboard:${date}`, `${espnBase}/scoreboard?dates=${date}`);
    res.setHeader("Cache-Control", "public, max-age=20");
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "No se pudo obtener el marcador de la fuente externa", detail: String(err) });
  }
});

app.get("/api/nba/games/:eventId/summary", async (req, res) => {
  const eventId = req.params.eventId;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(eventId)) return res.status(400).json({ error: "eventId no válido" });
  try {
    const data = await cachedJson(`summary:${eventId}`, `${espnBase}/summary?event=${encodeURIComponent(eventId)}`);
    res.setHeader("Cache-Control", "public, max-age=20");
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "No se pudo obtener el resumen del partido", detail: String(err) });
  }
});

app.listen(port, () => console.log(`Fantasy NBA stats adapter escuchando en :${port}`));
