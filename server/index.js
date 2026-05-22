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
   Fetches a real transcript from Taddy's podcast API using the episode
   audio URL to find the matching episode in their database.
   Falls back to AssemblyAI if Taddy doesn't have a transcript.

   Usage: POST /api/transcribe with body { audioUrl, title }             */
app.post("/api/transcribe", async (req, res) => {
  const { audioUrl, title } = req.body;

  if (!audioUrl) {
    return res.status(400).json({ error: "Missing audioUrl in request body." });
  }

  const TADDY_USER_ID = process.env.TADDY_USER_ID;
  const TADDY_API_KEY = process.env.TADDY_API_KEY;
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

  console.log(`[server] Looking up transcript for: ${title}`);

  /* ── STEP 1: Try Taddy first — they may already have the transcript ────
     We search for the episode by name to get its Taddy UUID, then fetch
     the transcript. This uses 1 request from our 500 monthly limit.     */
  if (TADDY_USER_ID && TADDY_API_KEY) {
    try {
      /* Search Taddy for the episode by title */
      const searchQuery = `
        query {
          searchForTerm(
            term: ${JSON.stringify(title || "")}
            filterForTypes: PODCASTEPISODE
          ) {
            podcastEpisodes {
              uuid
              name
              audioUrl
              transcript {
                sentences {
                  startTime
                  endTime
                  text
                }
              }
            }
          }
        }
      `;

      const taddyResponse = await fetch("https://api.taddy.org", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-USER-ID": TADDY_USER_ID,
          "X-API-KEY": TADDY_API_KEY,
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      const taddyData = await taddyResponse.json();
      const episodes = taddyData?.data?.searchForTerm?.podcastEpisodes || [];

      /* Find the episode that matches our audio URL or title */
      const matchedEpisode =
        episodes.find(
          (ep) =>
            ep.audioUrl === audioUrl ||
            ep.name?.toLowerCase() === (title || "").toLowerCase(),
        ) || episodes[0]; /* fall back to first result if no exact match */

      /* Check if Taddy has a transcript for this episode */
      const sentences = matchedEpisode?.transcript?.sentences || [];

      if (sentences.length > 0) {
        console.log(
          `[server] Taddy transcript found — ${sentences.length} sentences`,
        );

        /* Convert Taddy sentences to our transcript line format */
        const transcriptLines = sentences.map((sentence) => ({
          /* Taddy gives startTime in milliseconds — convert to seconds */
          time: Math.floor((sentence.startTime || 0) / 1000),
          text: sentence.text,
        }));

        const fullText = sentences.map((s) => s.text).join(" ");

        return res.json({
          transcript: transcriptLines,
          fullText,
          source: "taddy" /* tell frontend where transcript came from */,
          isPreview: false,
        });
      }

      console.log(
        "[server] Taddy has no transcript for this episode — falling back to AssemblyAI",
      );
    } catch (err) {
      console.warn(
        "[server] Taddy lookup failed:",
        err.message,
        "— falling back to AssemblyAI",
      );
    }
  }

  /* ── STEP 2: Fall back to AssemblyAI if Taddy has no transcript ────────
     AssemblyAI transcribes from the raw audio — slower but works on
     any episode regardless of whether Taddy knows about it.             */
  if (!ASSEMBLYAI_KEY) {
    return res
      .status(500)
      .json({ error: "No transcription service available." });
  }

  console.log(`[server] Transcribing with AssemblyAI: ${audioUrl}`);

  try {
    /* Submit audio to AssemblyAI */
    const submitResponse = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: ASSEMBLYAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speech_models: ["universal-2"],
          audio_end_at: 180000 /* first 3 minutes only */,
        }),
      },
    );

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
      const pollResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { Authorization: ASSEMBLYAI_KEY } },
      );
      transcriptData = await pollResponse.json();
      console.log(`[server] AssemblyAI status: ${transcriptData.status}`);
      if (transcriptData.status === "completed") break;
      if (transcriptData.status === "error")
        throw new Error(transcriptData.error);
      attempts++;
    }

    if (!transcriptData || transcriptData.status !== "completed") {
      throw new Error("Transcription timed out.");
    }

    /* Get sentences with timestamps */
    const sentencesResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
      { headers: { Authorization: ASSEMBLYAI_KEY } },
    );
    const sentencesData = await sentencesResponse.json();

    const transcriptLines = (sentencesData.sentences || []).map((sentence) => ({
      time: Math.floor(sentence.start / 1000),
      text: sentence.text,
    }));

    console.log(
      `[server] AssemblyAI complete — ${transcriptLines.length} lines`,
    );

    res.json({
      transcript: transcriptLines,
      fullText: transcriptData.text || "",
      source: "assemblyai",
      isPreview: true,
    });
  } catch (err) {
    console.error("[server] Transcription error:", err.message);
    res.status(502).json({ error: "Transcription failed: " + err.message });
  }
});

/* ── ROUTE: POST /api/insights ─────────────────────────────────────────────
   Sends the full transcript to Claude API which returns structured JSON
   insights with timestamps. Each insight includes the entity name, type,
   description, timestamp where it's mentioned, and links for Wikipedia,
   Amazon and IMDb.

   Usage: POST /api/insights with body { transcript: "full text", 
                                         lines: [{ time, text }] }       */
app.post("/api/insights", async (req, res) => {
  const { transcript, lines } = req.body;

  if (!transcript) {
    return res
      .status(400)
      .json({ error: "Missing transcript in request body." });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res
      .status(500)
      .json({ error: "ANTHROPIC_API_KEY not set in .env file." });
  }

  console.log("[server] Generating insights with Claude...");

  try {
    /* ── STEP 1: Initialise the Anthropic SDK ──────────────────────────── */
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: ANTHROPIC_KEY });

    /* ── STEP 2: Build the transcript with timestamps ──────────────────────
       We send the transcript lines with their timestamps so Claude can
       accurately pinpoint where each entity is mentioned.               */
    const transcriptWithTimestamps = (lines || [])
      .map((line) => `[${line.time}s] ${line.text}`)
      .join("\n");

    /* ── STEP 3: Build the prompt ──────────────────────────────────────────
       We tell Claude exactly what JSON structure to return so we can
       parse it reliably. We ask for timestamps so we can place dots
       on the audio timeline at exactly the right position.              */
    const prompt = `You are analyzing a podcast transcript. Extract the most interesting and important entities mentioned — people, books, films, TV shows, places, companies, or concepts.

For each entity return a JSON array. Each item must have:
- "timestamp": the number of seconds (from the [Xs] markers) where this entity is first mentioned
- "type": one of "person", "book", "film", "show", "place", "company", "concept"  
- "name": the entity name as mentioned
- "description": 1-2 sentences explaining who/what this is and why it's relevant to the podcast
- "wikipedia": the Wikipedia page title for this entity (just the title, no URL)
- "amazon": a good search query to find this on Amazon (for books especially)
- "imdb": a good search query to find this on IMDb (for films and shows)
- "relevance": one sentence on why this was mentioned in the podcast

Return ONLY a valid JSON array. No markdown, no explanation, no backticks. Just the raw JSON array starting with [ and ending with ].

Transcript:
${transcriptWithTimestamps}

Return the top 8 most interesting entities maximum.`;

    /* ── STEP 4: Call Claude API ───────────────────────────────────────────
       We use claude-3-haiku which is the fastest and cheapest model —
       perfect for structured data extraction like this.                 */
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    /* ── STEP 5: Parse the JSON response ───────────────────────────────────
       Claude returns a text block — we parse it as JSON.               */
    const rawText = message.content[0]?.text || "[]";
    console.log("[server] Claude raw response:", rawText.slice(0, 200));

    let insights = [];
    try {
      /* Strip any accidental markdown backticks just in case */
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[server] Failed to parse Claude JSON:", parseErr.message);
      insights = [];
    }

    /* ── STEP 6: Add full URLs to each insight ─────────────────────────────
       Convert the search terms into actual clickable links.            */
    insights = insights.map((insight) => ({
      ...insight,
      links: {
        wikipedia: insight.wikipedia
          ? `https://en.wikipedia.org/wiki/${encodeURIComponent(insight.wikipedia.replace(/ /g, "_"))}`
          : `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(insight.name)}`,
        amazon: `https://www.amazon.co.uk/s?k=${encodeURIComponent(insight.amazon || insight.name)}`,
        imdb: `https://www.imdb.com/find?q=${encodeURIComponent(insight.imdb || insight.name)}`,
      },
    }));

    console.log(`[server] Claude returned ${insights.length} insights`);
    res.json({ insights });
  } catch (err) {
    console.error("[server] Claude API error:", err.message);
    res
      .status(502)
      .json({ error: "Insights generation failed: " + err.message });
  }
});

/* ── ROUTE: GET /api/search ────────────────────────────────────────────────
   Searches for podcasts by name using Taddy's GraphQL API.
   Returns a list of matching podcasts with title, image and RSS URL.

   Usage: GET /api/search?q=freakonomics                                 */
app.get("/api/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing search query parameter q." });
  }

  const TADDY_USER_ID = process.env.TADDY_USER_ID;
  const TADDY_API_KEY = process.env.TADDY_API_KEY;

  if (!TADDY_USER_ID || !TADDY_API_KEY) {
    return res
      .status(500)
      .json({ error: "Taddy API credentials not set in .env file." });
  }

  console.log(`[server] Searching Taddy for: ${q}`);

  try {
    /* ── GraphQL query to search Taddy for podcasts by name ───────────────
       We ask for uuid, name, description, imageUrl and rssUrl so we have
       everything needed to display results and load the feed.            */
    const searchQuery = `
      query {
        searchForTerm(
          term: ${JSON.stringify(q)}
          filterForTypes: [PODCASTSERIES]
        ) {
          searchId
          podcastSeries {
            uuid
            name
            description(shouldStripHtmlTags: true)
            imageUrl
            rssUrl
          }
        }
      }
    `;

    const taddyResponse = await fetch("https://api.taddy.org", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-USER-ID": TADDY_USER_ID,
        "X-API-KEY": TADDY_API_KEY,
      },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!taddyResponse.ok) {
      throw new Error(`Taddy returned HTTP ${taddyResponse.status}`);
    }

    const taddyData = await taddyResponse.json();
    const podcasts = taddyData?.data?.searchForTerm?.podcastSeries || [];

    console.log(`[server] Taddy found ${podcasts.length} podcasts for "${q}"`);

    /* Return the podcast list to the frontend */
    res.json({ podcasts });
  } catch (err) {
    console.error("[server] Search error:", err.message);
    res.status(502).json({ error: "Search failed: " + err.message });
  }
});

/* ── ROUTE: GET /api/health ────────────────────────────────────────────────
   Health check — visit http://localhost:3001/api/health to confirm running */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PodPlayer backend is running!" });
});

app.post("/api/bookmark-note", async (req, res) => {
  const { text, time, type, episodeTitle } = req.body;
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `A podcast listener marked this moment as "${type}" at ${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")} in "${episodeTitle}": "${text}". Write ONE short sentence (max 20 words) explaining why this moment might be ${type}. No preamble.`,
      },
    ],
  });
  res.json({ note: msg.content[0]?.text || "" });
});
app.post("/api/summary", async (req, res) => {
  const { transcript, markedMoments, episodeTitle } = req.body;
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const prompt = `Summarise this podcast episode "${episodeTitle}" in 3-4 clear paragraphs. Focus especially on the moments the listener marked as important or confusing (listed below). Write for the listener personally.\n\nMarked moments:\n${markedMoments || "None marked"}\n\nTranscript:\n${transcript?.slice(0, 4000)}`;
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  res.json({ summary: msg.content[0]?.text || "" });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADD THIS ROUTE TO server/index.js
   Paste it directly above the app.listen() line at the bottom.

   POST /api/chapters
   Sends the transcript to Claude and gets back AI-generated chapter markers
   with timestamps and titles — shown inside the transcript panel.
───────────────────────────────────────────────────────────────────────────── */
app.post("/api/chapters", async (req, res) => {
  const { transcript, lines } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Missing transcript." });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set." });
  }

  console.log("[server] Generating chapters with Claude...");

  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic.Anthropic({ apiKey: ANTHROPIC_KEY });

    /* Build timestamped transcript for Claude to analyse */
    const transcriptWithTimestamps = (lines || [])
      .map((line) => `[${line.time}s] ${line.text}`)
      .join("\n");

    const prompt = `You are analysing a podcast transcript. Identify the main topic/chapter transitions in this podcast and generate chapter markers.

Return a JSON array where each item has:
- "timestamp": number of seconds where this chapter starts (from the [Xs] markers)
- "title": short chapter title (3-6 words max)
- "summary": one sentence describing what this section covers

Return ONLY a valid JSON array. No markdown, no explanation. Maximum 8 chapters.

Transcript:
${transcriptWithTimestamps}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0]?.text || "[]";
    console.log("[server] Chapters raw response:", rawText.slice(0, 200));

    let chapters = [];
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      chapters = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error(
        "[server] Failed to parse chapters JSON:",
        parseErr.message,
      );
      chapters = [];
    }

    console.log(`[server] Generated ${chapters.length} chapters`);
    res.json({ chapters });
  } catch (err) {
    console.error("[server] Chapters error:", err.message);
    res
      .status(502)
      .json({ error: "Chapter generation failed: " + err.message });
  }
});

/* ── START SERVER ──────────────────────────────────────────────────────────*/
app.listen(PORT, () => {
  console.log(`✅ PodPlayer backend running at http://localhost:${PORT}`);
  console.log(
    `   Taddy API loaded: ${process.env.TADDY_API_KEY ? "YES ✅" : "NO ❌ — check .env file"}`,
  );
});
