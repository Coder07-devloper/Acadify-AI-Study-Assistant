const axios = require("axios");
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const Chat = require("../models/Chat");
const { searchAndRankVideos } = require("../services/youtubeservices");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const getGroqHeaders = () => ({
Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
"Content-Type": "application/json",
});

// 🔹 Extract raw text from uploaded file (PDF or image) using pdf-parse + OCR
const extractMaterialText = async (file, ocrLang = "eng") => {
  if (!file) return "";

  const mimetype = file.mimetype || "";

  // Helper: run OCR on an image buffer
  const runOcr = async (buffer) => {
    try {
      const result = await Tesseract.recognize(buffer, ocrLang, {
        logger: () => {},
      });
      return result.data.text || "";
    } catch (err) {
      console.error("OCR error:", err.message);
      return "";
    }
  };

  // PDF branch
  if (mimetype === "application/pdf") {
    try {
      let rawText = "";

      if (typeof pdfParse === "function") {
        const pdfData = await pdfParse(file.buffer);
        rawText = pdfData.text || "";

        // If we got a decent amount of text, assume text-based PDF
        if (rawText && rawText.length > 400) {
          return rawText;
        }
      } else {
        console.error("pdf-parse is not a callable function, skipping direct parse.");
      }

      // Otherwise, treat as scanned PDF and OCR the first page
      const imageBuffer = await sharp(file.buffer, { density: 300 })
        .png()
        .toBuffer();
      const ocrText = await runOcr(imageBuffer);
      return ocrText || rawText;
    } catch (err) {
      console.error("PDF extract error:", err.message);
      return "";
    }
  }

  // Image branch
  if (mimetype.startsWith("image/")) {
    try {
      const normalized = await sharp(file.buffer)
        .resize(1600, null, { fit: "inside" })
        .png()
        .toBuffer();
      return await runOcr(normalized);
    } catch (err) {
      console.error("Image extract error:", err.message);
      return "";
    }
  }

  return "";
};

// 🔹 Extract study topics from raw notes text using LLM
const extractTopicsFromNotes = async (notesText) => {
  if (!notesText) return "";

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a precise study assistant. Given raw notes, extract the most important study topics and concepts as a concise bullet list. Do NOT add explanations, only short topic names.",
          },
          {
            role: "user",
            content: notesText.slice(0, 8000),
          },
        ],
        temperature: 0,
      },
      { headers: getGroqHeaders() }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Topic extraction error:", error.message);
    return "";
  }
};

// 🔹 Extract Parameters
const extractParameters = async (prompt) => {
try {
const response = await axios.post(
GROQ_API_URL,
{
model: "llama-3.1-8b-instant",
messages: [
{
role: "system",
content:
"You are a strict parameter extraction engine. Extract subject, timeAvailable, and goal from the user input. Return ONLY valid JSON with keys: subject, timeAvailable, goal. If the prompt is conversational or unclear, return subject as 'General Study', timeAvailable as 'Flexible', and goal as the user's prompt."
},
{
role: "user",
content: prompt
}
],
temperature: 0
},
{ headers: getGroqHeaders() }
);

// ````
let text = response.data.choices[0].message.content;

// remove markdown formatting if present
text = text.replace(/```json/g, "").replace(/```/g, "").trim();

let extracted;

try {
  extracted = JSON.parse(text);

  if (!extracted.subject || !extracted.timeAvailable || !extracted.goal) {
    throw new Error("Missing parameters");
  }

} catch (error) {
  console.log("Fallback extraction used");

  extracted = {
    subject: "General Study",
    timeAvailable: "Flexible",
    goal: prompt
  };
}

return extracted;
// ````

} catch (error) {
console.error("Parameter extraction error:", error.message);

// ```
return {
  subject: "General Study",
  timeAvailable: "Flexible",
  goal: prompt
};
// ```

}
};

// 🔹 Generate Roadmap with Context
const generateRoadmap = async (prompt, previousContext = "") => {

const response = await axios.post(
GROQ_API_URL,
{
model: "llama-3.1-8b-instant",
messages: [
{
role: "system",
content:
"You are an expert academic study assistant. Maintain conversation context and help students revise efficiently. Always return a very clear, structured study roadmap with:\n\n1. A short \"Overview\" section (2–3 sentences).\n2. A numbered list of study blocks labeled \"Step 1\", \"Step 2\", etc., each on its own line with topic + approximate time.\n3. A \"Key Topics\" bullet list.\n4. A brief \"Revision & Practice\" section with 3–4 concise bullet points.\n\nUse simple language suitable for students.",
},
{
role: "assistant",
content: previousContext || ""
},
{
role: "user",
content: prompt
}
],
temperature: 0.5
},
{ headers: getGroqHeaders() }
);

return response.data.choices[0].message.content.trim();
};

// 🔹 Main Controller
const generateResponse = async (req, res) => {
  try {
    const { prompt, chatId, language: rawLanguage } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res
        .status(400)
        .json({ message: "Prompt is required and must be a string" });
    }

    // optional: extract text from uploaded PDF/image using OCR where needed
    const materialText = await extractMaterialText(req.file);

    // extract parameters from the user's textual prompt only
    const extracted = await extractParameters(prompt);

    // fetch chat for this conversation if provided
    let chatRecord = null;
    if (chatId) {
      chatRecord = await Chat.findOne({
        _id: chatId,
        userId: req.user?._id,
      });
    }

    // build previous context from the latest assistant message, if any
    let previousContext = "";

    if (chatRecord && Array.isArray(chatRecord.messages) && chatRecord.messages.length) {
      const lastAssistant = [...chatRecord.messages]
        .reverse()
        .find((m) => m.role === "assistant");

      const lastUser = [...chatRecord.messages]
        .reverse()
        .find((m) => m.role === "user");

      if (lastAssistant) {
        const roadmapText =
          typeof lastAssistant.roadmap === "string"
            ? lastAssistant.roadmap
            : lastAssistant.content || "";

        previousContext = `Previous user request: ${
          lastUser?.content || chatRecord.message || ""
        }

Previous AI roadmap:
${roadmapText}`;
      }
    } else if (chatRecord && chatRecord.response && chatRecord.response.roadmap) {
      // Fallback for legacy chats that do not have messages array yet
      previousContext = `Previous user request: ${chatRecord.message}

Previous AI roadmap:
${chatRecord.response.roadmap}`;
    }

    // build prompt for roadmap, optionally enriched with document content
    let roadmapPrompt = prompt;

    if (materialText) {
      const topicsSummary = await extractTopicsFromNotes(materialText);
      if (topicsSummary) {
        roadmapPrompt = `${prompt}

Important topics extracted from my notes:
${topicsSummary}`;
      }
    }

    const language =
      typeof rawLanguage === "string"
        ? rawLanguage.toLowerCase()
        : "english";

    // generate roadmap and recommend videos in parallel
    const [roadmapRaw, recommendedVideos] = await Promise.all([
      generateRoadmap(roadmapPrompt, previousContext),
      searchAndRankVideos(
        extracted.subject,
        extracted.timeAvailable,
        extracted.goal,
        roadmapPrompt,
        language
      ),
    ]);

    // keep roadmap focused on the study plan text;
    // videos are returned separately via recommendedVideos
    const roadmap = roadmapRaw;

    // build conversation-style messages
    const userMessage = {
      role: "user",
      content: prompt,
      createdAt: new Date(),
    };

    const assistantMessage = {
      role: "assistant",
      content: typeof roadmap === "string" ? roadmap : "",
      roadmap,
      recommendedVideos,
      createdAt: new Date(),
    };

    // If this is the first prompt, create a new chat document
    if (!chatRecord) {
      chatRecord = await Chat.create({
        userId: req.user._id,
        messages: [userMessage, assistantMessage],
        // legacy fields kept so existing dashboard code continues to work
        message: prompt,
        response: {
          extractedParameters: extracted,
          roadmap,
          recommendedVideos,
        },
      });
    } else {
      // Ensure legacy chats are migrated to messages array on first use
      if (!Array.isArray(chatRecord.messages) || chatRecord.messages.length === 0) {
        if (chatRecord.message) {
          chatRecord.messages.push({
            role: "user",
            content: chatRecord.message,
            createdAt: chatRecord.createdAt,
          });
        }
        if (chatRecord.response && chatRecord.response.roadmap) {
          chatRecord.messages.push({
            role: "assistant",
            content:
              typeof chatRecord.response.roadmap === "string"
                ? chatRecord.response.roadmap
                : "",
            roadmap: chatRecord.response.roadmap,
            recommendedVideos:
              chatRecord.response.recommendedVideos || [],
            createdAt: chatRecord.updatedAt || new Date(),
          });
        }
      }

      chatRecord.messages.push(userMessage, assistantMessage);

      // keep legacy summary fields in sync with the latest exchange
      chatRecord.response = {
        extractedParameters: extracted,
        roadmap,
        recommendedVideos,
      };

      await chatRecord.save();
    }

    return res.status(200).json({
      extractedParameters: extracted,
      roadmap,
      recommendedVideos,
      chatId: chatRecord._id,
    });
  } catch (error) {
    console.error("Generate Response Error:", error.message);

    return res
      .status(500)
      .json({ message: "Error generating study roadmap" });
  }
};

// get chat history
const getChatHistory = async (req, res) => {
try {
const chats = await Chat.find({ userId: req.user.id })
.sort({ createdAt: -1 });

// ```
return res.status(200).json(chats);
// ```

} catch (error) {
console.error("Get history error:", error);
return res.status(500).json({ message: "Error fetching chat history" });
}
};

// get single chat
const getSingleChat = async (req, res) => {
try {
const chat = await Chat.findOne({
_id: req.params.id,
userId: req.user.id,
});

// ```
if (!chat) {
  return res.status(404).json({ message: "Chat not found" });
}

return res.status(200).json(chat);
// ```

} catch (error) {
console.error("Get single chat error:", error);
return res.status(500).json({ message: "Error fetching chat" });
}
};

// delete chat
const deleteChat = async (req, res) => {
try {
const chat = await Chat.findOneAndDelete({
_id: req.params.id,
userId: req.user.id,
});

// ```
if (!chat) {
  return res.status(404).json({ message: "Chat not found" });
}

return res.status(200).json({ message: "Chat deleted successfully" });
// ```

} catch (error) {
console.error("Delete chat error:", error);
return res.status(500).json({ message: "Error deleting chat" });
}
};

module.exports = {
extractParameters,
generateRoadmap,
generateResponse,
getChatHistory,
getSingleChat,
deleteChat,
};
