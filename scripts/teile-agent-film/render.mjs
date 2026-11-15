/**
 * Rendert den stummen Teile-Agent-Erklärfilm.
 * Chrome zeichnet jedes Bild, ffmpeg codiert H.264 mit schnellem Start.
 *
 *   node scripts/teile-agent-film/render.mjs
 *   FRAMES=48,480 node scripts/teile-agent-film/render.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, "../..");
const filmHtml = join(hier, "film.html");
const ziel = join(wurzel, "public/media/teile-agent.mp4");
const poster = join(wurzel, "public/media/teile-agent-poster.jpg");
const framesDir = "/tmp/teile-agent-frames";
const PORT = 9334;
const POSTER_FRAME = 11 * 24;
const stimme = join(hier, "stimme.mp3");

const nur = process.env.FRAMES
  ? new Set(process.env.FRAMES.split(",").map((n) => Number(n.trim())))
  : null;

mkdirSync(framesDir, { recursive: true });
mkdirSync(join(wurzel, "public/media"), { recursive: true });

await main();

async function main() {

const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--allow-file-access-from-files",
  "--font-render-hinting=none",
  `--remote-debugging-port=${PORT}`,
  "--remote-allow-origins=*",
  "--window-size=1120,1480",
  "--force-device-scale-factor=1",
  "--user-data-dir=/tmp/teile-agent-chrome",
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

let chromeLog = "";
chrome.stderr.on("data", (chunk) => {
  chromeLog += chunk.toString();
});

function aufraeumen() {
  chrome.kill("SIGKILL");
}

try {
  let version;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      await sleep(100);
    }
  }
  if (!version?.webSocketDebuggerUrl) {
    throw new Error(`Chrome nicht erreichbar.\n${chromeLog.slice(-2000)}`);
  }

  const seiten = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const seite = seiten.find((eintrag) => eintrag.type === "page") ?? seiten[0];
  const ws = new WebSocket(seite.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let seq = 0;
  const warten = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !warten.has(msg.id)) return;
    const { resolve, reject } = warten.get(msg.id);
    warten.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    warten.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1080,
    height: 1440,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `file://${filmHtml}` });

  let bereit = false;
  let grund = "";
  for (let i = 0; i < 80; i++) {
    const erg = await send("Runtime.evaluate", {
      expression: `(() => ({ bereit: window.FILM_BEREIT === true, grund: window.FILM_GRUND || "", frames: window.FILM_FRAMES || 0 }))()`,
      returnByValue: true,
    });
    const wert = erg.result?.value;
    if (wert?.bereit) {
      bereit = true;
      break;
    }
    grund = wert?.grund || grund;
    await sleep(100);
  }
  if (!bereit) throw new Error(`Film nicht bereit: ${grund}`);

  const meta = await send("Runtime.evaluate", {
    expression: `({ frames: window.FILM_FRAMES, fps: window.FILM_FPS, w: window.FILM_W, h: window.FILM_H })`,
    returnByValue: true,
  });
  const { frames, fps } = meta.result.value;
  console.log(`Zeichne ${nur ? nur.size : frames} Bilder, ${fps} fps`);

  const liste = nur ? [...nur].sort((a, b) => a - b) : Array.from({ length: frames }, (_, i) => i);
  const start = Date.now();
  for (let n = 0; n < liste.length; n++) {
    const frame = liste[n];
    await send("Runtime.evaluate", {
      expression: `window.zeichne(${frame})`,
      returnByValue: true,
    });
    const shot = await send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 94,
      clip: { x: 0, y: 0, width: 1080, height: 1440, scale: 1 },
      fromSurface: true,
      captureBeyondViewport: true,
    });
    const datei = join(framesDir, `${String(frame).padStart(4, "0")}.jpg`);
    writeFileSync(datei, Buffer.from(shot.data, "base64"));
    if (n % 48 === 0 || n === liste.length - 1) {
      const sek = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`${n + 1}/${liste.length} · Frame ${frame} · ${sek}s`);
    }
  }

  if (nur) {
    console.log(`Vorschau in ${framesDir}`);
    return;
  }

  await ffmpeg([
    "-y",
    "-framerate", String(fps),
    "-i", join(framesDir, "%04d.jpg"),
    "-i", stimme,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-level", "4.0",
    "-crf", "30",
    "-preset", "slow",
    "-c:a", "aac",
    "-b:a", "64k",
    "-movflags", "+faststart",
    "-shortest",
    ziel,
  ]);
  await ffmpeg([
    "-y",
    "-i", join(framesDir, `${String(POSTER_FRAME).padStart(4, "0")}.jpg`),
    "-vf", "scale=720:960",
    "-q:v", "4",
    poster,
  ]);
  console.log(`Film: ${ziel}`);
  console.log(`Poster: ${poster}`);
} finally {
  aufraeumen();
}

}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let log = "";
    proc.stderr.on("data", (chunk) => {
      log += chunk.toString();
    });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code}\n${log.slice(-2000)}`));
    });
  });
}
