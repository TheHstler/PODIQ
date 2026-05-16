/* ─────────────────────────────────────────────────────────────────────────────
   server/index.js
   Express backend for PodPlayer.
   Handles:
   1. RSS feed fetching (server-side, no CORS issues)
   2. AI transcription via Hugging Face Whisper API
   3. AI key insights via Hugging Face Flan-T5 API
───────────────────────────────────────────────────────────────────────────── */

/* dotenv loads our secret keys from the .env file into process.env */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = 3001;

/* Our Hugging Face API key — loaded from .env file, never hardcoded */
const HF_API_KEY = process.env.HF_API_KEY;

/* Using whisper-small instead of large-v3 — much faster on the free tier.
   Large-v3 times out on free inference because podcast files are too big. */
const WHISPER_URL =
  "https://api-inference.huggingface.co/models/openai/whisper-small";
const INSIGHTS_URL =
  "https://router.huggingface.co/hf-inference/models/google/flan-t5-large";

/* ── MIDDLEWARE ────────────────────────────────────────────────────────────*/
app.use(cors());
app.use(express.json());

/* ── HELPER: getText ───────────────────────────────────────────────────────
   Safely reads text content of an XML element. Returns "" if not found.  */
function getText(parent, tagName) {
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || "").trim() : "";
}

/* ── HELPER: getItunesField ────────────────────────────────────────────────
   Reads iTunes namespace tags like itunes:duration and itunes:image.     */
function getItunesField(parent, fieldName) {
  const byTag = parent.getElementsByTagName("itunes:" + fieldName)[0];
  if (byTag) return byTag;
  const byNS = parent.getElementsByTagNameNS(
    "http://www.itunes.com/dtds/podcast-1.0.dtd",
    fieldName,
  )[0];
  return byNS || null;
}

/* ── HELPER: stripHtml ─────────────────────────────────────────────────────
   Removes HTML tags from a string using regex.                           */
function stripHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── HELPER: extractChannelImage ───────────────────────────────────────────
   Gets podcast artwork from itunes:image or fallback image tag.         */
function extractChannelImage(channel) {
  const itunesImg = getItunesField(channel, "image");
  if (itunesImg && itunesImg.getAttribute("href")) {
    return itunesImg.getAttribute("href");
  }
  const rssImg = channel.getElementsByTagName("image")[0];
  if (rssImg) return getText(rssImg, "url");
  return "";
}

/* ── HELPER: extractItemImage ──────────────────────────────────────────────
   Gets episode artwork, falls back to channel artwork.                  */
function extractItemImage(item, channelImage) {
  const itunesImg = getItunesField(item, "image");
  if (itunesImg && itunesImg.getAttribute("href")) {
    return itunesImg.getAttribute("href");
  }
  return channelImage || "";
}

/* ── HELPER: formatDate ────────────────────────────────────────────────────
   Converts RFC 2822 date to readable format e.g. "12 May 2025".        */
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ── ROUTE: GET /api/feed ──────────────────────────────────────────────────
   Fetches and parses any podcast RSS feed URL server-side.
   Usage: GET /api/feed?url=https://feeds.megaphone.fm/darknetdiaries    */
app.get("/api/feed", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter." });
  }

  console.log(`[server] Fetching RSS feed: ${url}`);

  /* Fetch the RSS XML server-to-server — no CORS restrictions here */
  let rawXml;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PodPlayer/1.0 (Podcast RSS Reader)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawXml = await response.text();
  } catch (err) {
    console.error("[server] Fetch error:", err.message);
    return res
      .status(502)
      .json({ error: "Could not fetch feed: " + err.message });
  }

  /* Parse the XML using xmldom */
  try {
    const { DOMParser } = require("@xmldom/xmldom");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawXml, "application/xml");
    const channel = xmlDoc.getElementsByTagName("channel")[0];
    if (!channel) throw new Error("No <channel> found");

    const channelImage = extractChannelImage(channel);
    const channelInfo = {
      title: getText(channel, "title") || "Untitled Podcast",
      description: stripHtml(getText(channel, "description")),
      image: channelImage,
    };

    const items = Array.from(xmlDoc.getElementsByTagName("item"));
    const episodes = items.map((item, index) => {
      /* Try multiple ways to find the audio URL —
   some feeds use enclosure, others use media:content or link */
      const enclosure = item.getElementsByTagName("enclosure")[0];
      const mediaContent = item.getElementsByTagName("media:content")[0];
      const mediaGroup = item.getElementsByTagName("media:group")[0];

      let audioSrc = "";
      if (enclosure && enclosure.getAttribute("url")) {
        /* Standard RSS — most podcast feeds use this */
        audioSrc = enclosure.getAttribute("url");
      } else if (mediaContent && mediaContent.getAttribute("url")) {
        /* Some feeds use media:content instead */
        audioSrc = mediaContent.getAttribute("url");
      } else if (mediaGroup) {
        /* Some feeds wrap media in a group element */
        const groupMedia = mediaGroup.getElementsByTagName("media:content")[0];
        audioSrc = groupMedia ? groupMedia.getAttribute("url") || "" : "";
      }
      const durationEl = getItunesField(item, "duration");
      return {
        guid: getText(item, "guid") || String(index),
        title: stripHtml(getText(item, "title")) || "Untitled Episode",
        description: stripHtml(
          getText(item, "description") ||
            (getItunesField(item, "summary") || {}).textContent ||
            "",
        ),
        audioSrc,
        pubDate: formatDate(getText(item, "pubDate")),
        duration: durationEl ? durationEl.textContent.trim() : "",
        image: extractItemImage(item, channelImage),
      };
    });

    console.log(`[server] Parsed ${episodes.length} episodes`);
    res.json({ channel: channelInfo, episodes });
  } catch (err) {
    console.error("[server] Parse error:", err.message);
    res.status(500).json({ error: "Failed to parse RSS XML: " + err.message });
  }
});

/* ── ROUTE: POST /api/transcribe ───────────────────────────────────────────
   Takes a podcast audio URL, downloads the first 60 seconds of audio,
   sends it to Hugging Face Whisper API, and returns a transcript.

   Why only 60 seconds? The free HF inference API has a file size limit.
   For a student demo this is clearly labelled as a preview.

   Usage: POST /api/transcribe with body { audioUrl: "https://..." }     */
app.post("/api/transcribe", async (req, res) => {
  const { audioUrl } = req.body;

  if (!audioUrl) {
    return res.status(400).json({ error: "Missing audioUrl in request body." });
  }

  if (!HF_API_KEY) {
    return res.status(500).json({ error: "HF_API_KEY not set in .env file." });
  }

  console.log(`[server] Transcribing audio from: ${audioUrl}`);

  /* ── STEP 1: Download the audio file from the podcast URL ──────────────
     We fetch the raw audio bytes so we can send them to Whisper.        */
  let audioBuffer;
  try {
    const audioResponse = await fetch(audioUrl, {
      headers: { "User-Agent": "PodPlayer/1.0" },
    });
    if (!audioResponse.ok) throw new Error(`HTTP ${audioResponse.status}`);

    /* Download audio but cap at 1MB to avoid timeout on free tier.
   This gives roughly 60 seconds of audio for Whisper to transcribe. */
    audioBuffer = await audioResponse.buffer();
    const MAX_BYTES = 1 * 1024 * 1024; /* 1MB limit */
    if (audioBuffer.length > MAX_BYTES) {
      audioBuffer = audioBuffer.slice(0, MAX_BYTES);
      console.log(`[server] Audio capped at 1MB for free tier compatibility`);
    }
    console.log(`[server] Sending ${audioBuffer.length} bytes to Whisper`);
  } catch (err) {
    console.error("[server] Audio download error:", err.message);
    return res
      .status(502)
      .json({ error: "Could not download audio: " + err.message });
  }

  /* ── STEP 2: Send audio to Hugging Face Whisper API ────────────────────
     We send the raw audio bytes directly to the Whisper model endpoint.
     Whisper returns a JSON object with a "text" field containing the
     full transcript as a plain string.                                   */
  let transcript;
  try {
    const hfResponse = await fetch(WHISPER_URL, {
      method: "POST",
      headers: {
        /* Our API key for authentication */
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "audio/mpeg",
      },
      /* Send the raw audio bytes as the request body */
      body: audioBuffer,
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      throw new Error(`Whisper API returned ${hfResponse.status}: ${errText}`);
    }

    const result = await hfResponse.json();
    transcript = result.text || "";
    console.log(
      `[server] Transcription complete — ${transcript.length} characters`,
    );
  } catch (err) {
    console.error("[server] Whisper API error:", err.message);
    return res
      .status(502)
      .json({ error: "Transcription failed: " + err.message });
  }

  /* ── STEP 3: Split transcript into timestamped chunks ──────────────────
     Whisper returns one big text string. We split it into chunks of
     roughly 15 words each and assign an estimated timestamp to each one.
     This gives us the clickable transcript lines the player page expects.*/
  const words = transcript.split(" ").filter(Boolean);
  const chunkSize = 15; /* words per transcript line */
  const transcriptLines = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    /* Estimate timestamp: assume average speaking pace of ~2.5 words/sec */
    const estimatedSeconds = Math.floor(i / 2.5);
    transcriptLines.push({
      time: estimatedSeconds,
      text: chunk,
    });
  }

  /* Return the transcript lines and the raw full text */
  res.json({
    transcript: transcriptLines,
    fullText: transcript,
    isPreview: true /* flag so frontend can show "preview" label */,
  });
});

/* ── ROUTE: POST /api/insights ─────────────────────────────────────────────
   Takes a transcript text, sends it to Flan-T5 on Hugging Face, and
   returns a list of key insights.

   Usage: POST /api/insights with body { transcript: "full text here" } */
app.post("/api/insights", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res
      .status(400)
      .json({ error: "Missing transcript in request body." });
  }

  if (!HF_API_KEY) {
    return res.status(500).json({ error: "HF_API_KEY not set in .env file." });
  }

  console.log(`[server] Generating insights from transcript...`);

  /* ── STEP 1: Trim transcript to avoid token limits ─────────────────────
     Flan-T5 has an input limit so we only send the first 1000 characters.
     This is enough context for meaningful insights.                      */
  const trimmedTranscript = transcript.slice(0, 1000);

  /* ── STEP 2: Build the prompt for Flan-T5 ─────────────────────────────
     We structure the prompt to get a numbered list of insights back.    */
  const prompt = `Read this podcast transcript and give 4 key insights as a numbered list:

"${trimmedTranscript}"

Key insights:`;

  /* ── STEP 3: Send prompt to Hugging Face Flan-T5 API ──────────────────*/
  let insightsText;
  try {
    const hfResponse = await fetch(INSIGHTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.7,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      throw new Error(`Insights API returned ${hfResponse.status}: ${errText}`);
    }

    const result = await hfResponse.json();
    /* Flan-T5 returns an array — we take the first result's generated text */
    insightsText = result[0]?.generated_text || "";
    console.log(`[server] Insights generated: ${insightsText}`);
  } catch (err) {
    console.error("[server] Insights API error:", err.message);
    return res
      .status(502)
      .json({ error: "Insights generation failed: " + err.message });
  }

  /* ── STEP 4: Parse the numbered list into an array ─────────────────────
     We split on newlines and numbers to get individual insight strings.  */
  const insights = insightsText
    .split(/\n|\d+\./) /* split on newlines or "1." "2." etc */
    .map((s) => s.trim()) /* remove whitespace */
    .filter((s) => s.length > 10); /* remove empty or very short lines */

  res.json({ insights });
});

/* ── ROUTE: GET /api/health ────────────────────────────────────────────────
   Health check — visit http://localhost:3001/api/health to confirm running */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PodPlayer backend is running!" });
});

/* ── START SERVER ──────────────────────────────────────────────────────────*/
app.listen(PORT, () => {
  console.log(`✅ PodPlayer backend running at http://localhost:${PORT}`);
  console.log(
    `   HF API Key loaded: ${HF_API_KEY ? "YES ✅" : "NO ❌ — check .env file"}`,
  );
});
