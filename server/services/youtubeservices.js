const axios = require("axios");

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";

// 🔹 Safe Duration Parser
const parseDurationToMinutes = (duration) => {
  if (!duration || typeof duration !== "string") return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  return hours * 60 + minutes + seconds / 60;
};

// 🔹 Extract numeric hours from text like "3 hours"
const extractHours = (timeAvailable) => {
  if (!timeAvailable) return 1;

  const match = timeAvailable.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
};

const searchAndRankVideos = async (
  subject,
  timeAvailable,
  goal,
  fullPrompt,
  language = "english"
) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY not configured");
    }

    // 🔹 STEP 1 — Search Videos
    const baseQuery = subject || "";
    let languageSuffix = "";

    const lang = (language || "english").toLowerCase();
    if (lang === "hindi") {
      languageSuffix = " hindi explanation";
    } else {
      languageSuffix = " english explanation";
    }

    const searchResponse = await axios.get(
      `${YOUTUBE_BASE_URL}/search`,
      {
        params: {
          part: "snippet",
          q: `${baseQuery} ${languageSuffix}`.trim(),
          type: "video",
          maxResults: 10,
          key: apiKey,
        },
      }
    );

    if (!searchResponse.data?.items?.length) {
      return [];
    }

    // Extract video IDs safely
    const videoIds = searchResponse.data.items
      .map((item) => item.id?.videoId)
      .filter((id) => id);

    if (!videoIds.length) {
      return [];
    }

    // 🔹 STEP 2 — Get Video Details
    const videoResponse = await axios.get(
      `${YOUTUBE_BASE_URL}/videos`,
      {
        params: {
          part: "contentDetails,snippet",
          id: videoIds.join(","),
          key: apiKey,
        },
      }
    );

    if (!videoResponse.data?.items?.length) {
      return [];
    }

    const availableHours = extractHours(timeAvailable);
    const availableMinutes = availableHours * 60;

    const uselessKeywords = [
      "shorts",
      "meme",
      "funny",
      "reaction",
      "trailer"
    ];

    const urgencyKeywords = [
      "tomorrow",
      "exam",
      "revision",
      "last minute",
      "crash"
    ];

    const clarityKeywords = [
      "simple",
      "easy",
      "beginners",
      "explained",
      "step by step"
    ];

    const goalKeywordsPass = [
      "important",
      "exam",
      "revision",
      "one shot",
      "crash"
    ];

    const goalKeywordsGood = [
      "complete",
      "full",
      "detailed",
      "in-depth",
      "concept"
    ];

    const filteredVideos = videoResponse.data.items
      .map((video) => {
        const title = video.snippet?.title?.toLowerCase() || "";
        const durationMinutes = parseDurationToMinutes(
          video.contentDetails?.duration
        );

        // 🔹 FILTERING

        // Subject match
        if (!title.includes(subject.toLowerCase())) return null;

        // Remove useless types
        if (uselessKeywords.some((word) => title.includes(word)))
          return null;

        // Duration filter (hard filter)
        if (durationMinutes > availableMinutes * 2)
          return null;

        // 🔹 SCORING (out of 5)
        let score = 0;

        // 1️⃣ Subject relevance
        score += 1;

        // 2️⃣ Duration fit
        if (durationMinutes <= availableMinutes)
          score += 1;

        // 3️⃣ Goal-based scoring
        if (
          goal?.toLowerCase().includes("pass") ||
          goal?.toLowerCase().includes("average")
        ) {
          if (goalKeywordsPass.some((word) => title.includes(word)))
            score += 1;
        }

        if (goal?.toLowerCase().includes("good")) {
          if (goalKeywordsGood.some((word) => title.includes(word)))
            score += 1;
        }

        // 4️⃣ Urgency match
        if (
          urgencyKeywords.some((word) =>
            fullPrompt?.toLowerCase().includes(word)
          ) &&
          urgencyKeywords.some((word) => title.includes(word))
        ) {
          score += 1;
        }

        // 5️⃣ Clarity indicator
        if (clarityKeywords.some((word) => title.includes(word)))
          score += 1;

        return {
          title: video.snippet.title,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          durationMinutes: Math.round(durationMinutes),
          score
        };
      })
      .filter((video) => video !== null);

    // Sort descending by score
    filteredVideos.sort((a, b) => b.score - a.score);

    return filteredVideos.slice(0, 3);

  } catch (error) {
    console.error(
      "YouTube Engine Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = {
  searchAndRankVideos,
};