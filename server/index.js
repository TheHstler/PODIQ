/* ─────────────────────────────────────────────────────────────────────────────
   server/index.js
   Express backend for PodPlayer.
───────────────────────────────────────────────────────────────────────────── */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/* ── HELPERS ── */
function getText(parent, tagName) {
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || "").trim() : "";
}

function getItunesField(parent, fieldName) {
  const byTag = parent.getElementsByTagName("itunes:" + fieldName)[0];
  if (byTag) return byTag;
  const byNS = parent.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", fieldName)[0];
  return byNS || null;
}

function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractChannelImage(channel) {
  const itunesImg = getItunesField(channel, "image");
  if (itunesImg && itunesImg.getAttribute("href")) return itunesImg.getAttribute("href");
  const rssImg = channel.getElementsByTagName("image")[0];
  if (rssImg) return getText(rssImg, "url");
  return "";
}

function extractItemImage(item, channelImage) {
  const itunesImg = getItunesField(item, "image");
  if (itunesImg && itunesImg.getAttribute("href")) return itunesImg.getAttribute("href");
  return channelImage || "";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

/* ── ROUTE: GET /api/feed ── */
app.get("/api/feed", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter." });
  console.log(`[server] Fetching RSS feed: ${url}`);
  let rawXml;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "PodPlayer/1.0", Accept: "application/rss+xml, application/xml, text/xml, */*" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawXml = await response.text();
  } catch (err) {
    return res.status(502).json({ error: "Could not fetch feed: " + err.message });
  }
  try {
    const { DOMParser } = require("@xmldom/xmldom");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawXml, "application/xml");
    const channel = xmlDoc.getElementsByTagName("channel")[0];
    if (!channel) throw new Error("No <channel> found");
    const channelImage = extractChannelImage(channel);
    const channelInfo = { title: getText(channel, "title") || "Untitled Podcast", description: stripHtml(getText(channel, "description")), image: channelImage };
    const items = Array.from(xmlDoc.getElementsByTagName("item"));
    const episodes = items.map((item, index) => {
      const enclosure = item.getElementsByTagName("enclosure")[0];
      const mediaContent = item.getElementsByTagName("media:content")[0];
      const mediaGroup = item.getElementsByTagName("media:group")[0];
      let audioSrc = "";
      if (enclosure && enclosure.getAttribute("url")) audioSrc = enclosure.getAttribute("url");
      else if (mediaContent && mediaContent.getAttribute("url")) audioSrc = mediaContent.getAttribute("url");
      else if (mediaGroup) { const gm = mediaGroup.getElementsByTagName("media:content")[0]; audioSrc = gm ? gm.getAttribute("url") || "" : ""; }
      const durationEl = getItunesField(item, "duration");
      return {
        guid: getText(item, "guid") || String(index),
        title: stripHtml(getText(item, "title")) || "Untitled Episode",
        description: stripHtml(getText(item, "description") || (getItunesField(item, "summary") || {}).textContent || ""),
        audioSrc, pubDate: formatDate(getText(item, "pubDate")),
        duration: durationEl ? durationEl.textContent.trim() : "",
        image: extractItemImage(item, channelImage),
      };
    });
    console.log(`[server] Parsed ${episodes.length} episodes`);
    res.json({ channel: channelInfo, episodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to parse RSS XML: " + err.message });
  }
});

/* ── ROUTE: POST /api/transcribe ─────────────────────────────────────────────
   Now includes speaker_labels: true for AssemblyAI so each sentence
   gets a speaker ID (A, B, C...). After transcription, Claude is used
   to identify the real names of each speaker from context.              */
app.post("/api/transcribe", async (req, res) => {
  const { audioUrl, title } = req.body;
  if (!audioUrl) return res.status(400).json({ error: "Missing audioUrl." });

  const TADDY_USER_ID = process.env.TADDY_USER_ID;
  const TADDY_API_KEY = process.env.TADDY_API_KEY;
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

  console.log(`[server] Looking up transcript for: ${title}`);

  /* ── STEP 1: Try Taddy first ── */
  if (TADDY_USER_ID && TADDY_API_KEY) {
    try {
      const searchQuery = `
        query {
          searchForTerm(term: ${JSON.stringify(title || "")} filterForTypes: PODCASTEPISODE) {
            podcastEpisodes {
              uuid name audioUrl
              transcript { sentences { startTime endTime text } }
            }
          }
        }
      `;
      const taddyResponse = await fetch("https://api.taddy.org", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-USER-ID": TADDY_USER_ID, "X-API-KEY": TADDY_API_KEY },
        body: JSON.stringify({ query: searchQuery }),
      });
      const taddyData = await taddyResponse.json();
      const episodes = taddyData?.data?.searchForTerm?.podcastEpisodes || [];
      const matchedEpisode = episodes.find((ep) => ep.audioUrl === audioUrl || ep.name?.toLowerCase() === (title || "").toLowerCase()) || episodes[0];
      const sentences = matchedEpisode?.transcript?.sentences || [];

      if (sentences.length > 0) {
        console.log(`[server] Taddy transcript found — ${sentences.length} sentences`);
        /* Taddy doesn't give speaker labels so we just return without speakers */
        const transcriptLines = sentences.map((sentence) => ({
          time: Math.floor((sentence.startTime || 0) / 1000),
          text: sentence.text,
          speaker: null,
          speakerLabel: null,
        }));
        const fullText = sentences.map((s) => s.text).join(" ");
        return res.json({ transcript: transcriptLines, fullText, source: "taddy", isPreview: false });
      }
      console.log("[server] Taddy has no transcript — falling back to AssemblyAI");
    } catch (err) {
      console.warn("[server] Taddy failed:", err.message);
    }
  }

  /* ── STEP 2: AssemblyAI with speaker diarization ── */
  if (!ASSEMBLYAI_KEY) return res.status(500).json({ error: "No transcription service available." });

  console.log(`[server] Transcribing with AssemblyAI (speaker diarization on): ${audioUrl}`);

  try {
    /* Submit with speaker_labels: true — this tells AssemblyAI to detect
       who is speaking and label each sentence with speaker_a, speaker_b etc */
    const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: { Authorization: ASSEMBLYAI_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,        /* ← enables speaker diarization */
        audio_end_at: 180000,        /* first 3 minutes only */
      }),
    });

    if (!submitResponse.ok) {
      const err = await submitResponse.text();
      throw new Error(`AssemblyAI submit failed: ${err}`);
    }

    const submitData = await submitResponse.json();
    const transcriptId = submitData.id;
    console.log(`[server] AssemblyAI job submitted: ${transcriptId}`);

    /* Poll until complete */
    let transcriptData;
    let attempts = 0;
    while (attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: { Authorization: ASSEMBLYAI_KEY } });
      transcriptData = await pollResponse.json();
      console.log(`[server] AssemblyAI status: ${transcriptData.status}`);
      if (transcriptData.status === "completed") break;
      if (transcriptData.status === "error") throw new Error(transcriptData.error);
      attempts++;
    }

    if (!transcriptData || transcriptData.status !== "completed") throw new Error("Transcription timed out.");

    /* Get sentences — these now include speaker field */
    const sentencesResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`, { headers: { Authorization: ASSEMBLYAI_KEY } });
    const sentencesData = await sentencesResponse.json();
    const sentences = sentencesData.sentences || [];

    console.log(`[server] AssemblyAI complete — ${sentences.length} lines`);

    /* Build initial transcript lines with raw speaker IDs (A, B, C...) */
    const transcriptLines = sentences.map((sentence) => ({
      time: Math.floor(sentence.start / 1000),
      text: sentence.text,
      /* AssemblyAI returns speaker as "A", "B" etc */
      speaker: sentence.speaker || null,
      speakerLabel: sentence.speaker ? `Speaker ${sentence.speaker}` : null,
    }));

    const fullText = transcriptData.text || "";

    /* ── STEP 3: Use Claude to identify real speaker names ──────────────────
       We send the first 30 lines of transcript to Claude and ask it to
       figure out who is speaking based on context clues like introductions,
       names being said, or host/guest patterns.                          */
    const speakerMap = await identifySpeakers(transcriptLines, title);

    /* Apply the real names from Claude to each line */
    const labelledLines = transcriptLines.map((line) => ({
      ...line,
      speakerLabel: line.speaker && speakerMap[line.speaker]
        ? speakerMap[line.speaker]
        : line.speakerLabel,
    }));

    console.log(`[server] Speaker map:`, speakerMap);

    res.json({ transcript: labelledLines, fullText, source: "assemblyai", isPreview: true, speakerMap });

  } catch (err) {
    console.error("[server] Transcription error:", err.message);
    res.status(502).json({ error: "Transcription failed: " + err.message });
  }
});

/* ── HELPER: identifySpeakers ───────────────────────────────────────────────
   Sends the first chunk of transcript to Claude and asks it to identify
   who each speaker (A, B, C...) actually is based on context.
   Returns a map like { "A": "Jack Rhysider", "B": "Guest Name" }        */
async function identifySpeakers(transcriptLines, episodeTitle) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return {};

  /* Only send first 30 lines — enough for Claude to figure out names */
  const sample = transcriptLines
    .slice(0, 30)
    .filter((l) => l.speaker)
    .map((l) => `[Speaker ${l.speaker}] ${l.text}`)
    .join("\n");

  if (!sample) return {};

  /* Find unique speaker IDs */
  const uniqueSpeakers = [...new Set(transcriptLines.filter((l) => l.speaker).map((l) => l.speaker))];
  if (!uniqueSpeakers.length) return {};

  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: ANTHROPIC_KEY });

    const prompt = `This is the beginning of a podcast episode called "${episodeTitle}".

The transcript has been automatically labelled with speaker IDs (A, B, C...).

Your job is to identify the real name of each speaker based on context clues — introductions, names being mentioned, host/guest patterns, or anything else in the text.

Transcript sample:
${sample}

Speakers found: ${uniqueSpeakers.map((s) => `Speaker ${s}`).join(", ")}

Return ONLY a valid JSON object mapping speaker ID to their real name. If you cannot determine a name, use "Host" for the first speaker and "Guest" for others.

Example: {"A": "Jack Rhysider", "B": "Kevin Mitnick"}

Return ONLY the JSON object, no explanation, no markdown.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0]?.text || "{}";
    console.log("[server] Speaker identification response:", rawText);

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[server] Speaker identification failed:", err.message);
    /* Fall back to generic labels */
    const fallback = {};
    uniqueSpeakers.forEach((s, i) => { fallback[s] = i === 0 ? "Host" : `Guest ${i}`; });
    return fallback;
  }
}

/* ── ROUTE: POST /api/insights ── */
app.post("/api/insights", async (req, res) => {
  const { transcript, lines } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript." });
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });
  console.log("[server] Generating insights with Claude...");
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: ANTHROPIC_KEY });
    const transcriptWithTimestamps = (lines || []).map((line) => `[${line.time}s] ${line.text}`).join("\n");
    const prompt = `You are analyzing a podcast transcript. Extract the most interesting and important entities mentioned — people, books, films, TV shows, places, companies, or concepts.

For each entity return a JSON array. Each item must have:
- "timestamp": seconds from the [Xs] markers where first mentioned
- "type": one of "person", "book", "film", "show", "place", "company", "concept"
- "name": entity name as mentioned
- "description": 1-2 sentences explaining what/who this is
- "wikipedia": Wikipedia page title (just the title, no URL)
- "amazon": search query for Amazon
- "imdb": search query for IMDb
- "relevance": one sentence on why it was mentioned

Return ONLY a valid JSON array. No markdown, no explanation. Maximum 8 entities.

Transcript:
${transcriptWithTimestamps}`;

    const message = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 2000, messages: [{ role: "user", content: prompt }] });
    const rawText = message.content[0]?.text || "[]";
    console.log("[server] Claude insights response:", rawText.slice(0, 200));
    let insights = [];
    try {
      insights = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch (e) { insights = []; }
    insights = insights.map((insight) => ({
      ...insight,
      links: {
        wikipedia: insight.wikipedia ? `https://en.wikipedia.org/wiki/${encodeURIComponent(insight.wikipedia.replace(/ /g, "_"))}` : `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(insight.name)}`,
        amazon: `https://www.amazon.co.uk/s?k=${encodeURIComponent(insight.amazon || insight.name)}`,
        imdb: `https://www.imdb.com/find?q=${encodeURIComponent(insight.imdb || insight.name)}`,
      },
    }));
    console.log(`[server] Returned ${insights.length} insights`);
    res.json({ insights });
  } catch (err) {
    console.error("[server] Insights error:", err.message);
    res.status(502).json({ error: "Insights generation failed: " + err.message });
  }
});

/* ── ROUTE: POST /api/summary ── */
app.post("/api/summary", async (req, res) => {
  const { transcript, markedMoments, episodeTitle } = req.body;
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Summarise this podcast episode "${episodeTitle}" in 3-4 clear paragraphs. Focus especially on the moments the listener marked as important or confusing. Write directly to the listener in second person.\n\nMarked moments:\n${markedMoments || "None marked yet"}\n\nTranscript:\n${(transcript || "").slice(0, 4000)}`;
    const message = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] });
    res.json({ summary: message.content[0]?.text || "" });
  } catch (err) {
    console.error("[server] Summary error:", err.message);
    res.status(502).json({ error: "Summary failed: " + err.message });
  }
});

/* ── ROUTE: POST /api/bookmark-note ── */
app.post("/api/bookmark-note", async (req, res) => {
  const { text, time, type, episodeTitle } = req.body;
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const mins = Math.floor(time / 60);
    const secs = String(time % 60).padStart(2, "0");
    const message = await client.messages.create({
      model: "claude-haiku-4-5", max_tokens: 150,
      messages: [{ role: "user", content: `A podcast listener marked this moment as "${type}" at ${mins}:${secs} in "${episodeTitle}": "${text}". Write ONE short sentence (max 20 words) explaining why this moment might be ${type}. No preamble.` }],
    });
    res.json({ note: message.content[0]?.text || "" });
  } catch (err) {
    console.error("[server] Bookmark note error:", err.message);
    res.status(502).json({ note: "" });
  }
});

/* ── ROUTE: POST /api/chapters ── */
app.post("/api/chapters", async (req, res) => {
  const { transcript, lines } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript." });
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });
  console.log("[server] Generating chapters with Claude...");
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: ANTHROPIC_KEY });
    const transcriptWithTimestamps = (lines || []).map((line) => `[${line.time}s] ${line.text}`).join("\n");
    const prompt = `You are analysing a podcast transcript. Identify the main topic/chapter transitions and generate chapter markers.

Return a JSON array where each item has:
- "timestamp": number of seconds where this chapter starts
- "title": short chapter title (3-6 words max)
- "summary": one sentence describing what this section covers

Return ONLY a valid JSON array. No markdown. Maximum 8 chapters.

Transcript:
${transcriptWithTimestamps}`;
    const message = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 800, messages: [{ role: "user", content: prompt }] });
    const rawText = message.content[0]?.text || "[]";
    let chapters = [];
    try { chapters = JSON.parse(rawText.replace(/```json|```/g, "").trim()); } catch (e) { chapters = []; }
    console.log(`[server] Generated ${chapters.length} chapters`);
    res.json({ chapters });
  } catch (err) {
    console.error("[server] Chapters error:", err.message);
    res.status(502).json({ error: "Chapter generation failed: " + err.message });
  }
});

/* ── ROUTE: GET /api/search ── */
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing search query." });
  const TADDY_USER_ID = process.env.TADDY_USER_ID;
  const TADDY_API_KEY = process.env.TADDY_API_KEY;
  if (!TADDY_USER_ID || !TADDY_API_KEY) return res.status(500).json({ error: "Taddy API credentials not set." });
  console.log(`[server] Searching Taddy for: ${q}`);
  try {
    const searchQuery = `
      query {
        searchForTerm(term: ${JSON.stringify(q)} filterForTypes: [PODCASTSERIES]) {
          searchId
          podcastSeries { uuid name description(shouldStripHtmlTags: true) imageUrl rssUrl }
        }
      }
    `;
    const taddyResponse = await fetch("https://api.taddy.org", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-USER-ID": TADDY_USER_ID, "X-API-KEY": TADDY_API_KEY },
      body: JSON.stringify({ query: searchQuery }),
    });
    if (!taddyResponse.ok) throw new Error(`Taddy returned HTTP ${taddyResponse.status}`);
    const taddyData = await taddyResponse.json();
    const podcasts = taddyData?.data?.searchForTerm?.podcastSeries || [];
    console.log(`[server] Taddy found ${podcasts.length} podcasts for "${q}"`);
    res.json({ podcasts });
  } catch (err) {
    console.error("[server] Search error:", err.message);
    res.status(502).json({ error: "Search failed: " + err.message });
  }
});

/* ── ROUTE: GET /api/health ── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PodPlayer backend is running!" });
});

/* ── START SERVER ── */
app.listen(PORT, () => {
  console.log(`✅ PodPlayer backend running at http://localhost:${PORT}`);
  console.log(`   Taddy API: ${process.env.TADDY_API_KEY ? "YES ✅" : "NO ❌"}`);
  console.log(`   AssemblyAI: ${process.env.ASSEMBLYAI_API_KEY ? "YES ✅" : "NO ❌"}`);
  console.log(`   Anthropic: ${process.env.ANTHROPIC_API_KEY ? "YES ✅" : "NO ❌"}`);
});
