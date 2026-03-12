import { useEffect, useState, useRef } from "react";
import API from "../api/api";
import GlowLayout from "../components/Glowlayout.jsx";

const Dashboard = () => {
const storedName = typeof window !== "undefined"
  ? localStorage.getItem("userName") || "User"
  : "User";
const storedEmail = typeof window !== "undefined"
  ? localStorage.getItem("userEmail") || "Email not available"
  : "Email not available";
const userInitial = storedName.charAt(0).toUpperCase();
const [prompt, setPrompt] = useState("");
const [messages, setMessages] = useState([]);
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(false);
const [file, setFile] = useState(null);
const [showTips, setShowTips] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(true);
const [activeChatId, setActiveChatId] = useState(null);
const [language, setLanguage] = useState("english");
const [isListening, setIsListening] = useState(false);
const [micSupported, setMicSupported] = useState(false);
const [micError, setMicError] = useState("");
const fileInputRef = useRef(null);
const recognitionRef = useRef(null);
const finalTranscriptRef = useRef("");
const basePromptRef = useRef("");
const isStartingRef = useRef(false);
const isStoppingRef = useRef(false);
const retryTimeoutRef = useRef(null);
const networkRetryCountRef = useRef(0);

const renderRoadmap = (roadmap) => {
if (!roadmap) return null;

const lines = roadmap
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

if (!lines.length) return null;

let overview = [];
const steps = [];
let keyTopics = [];
let revision = [];

let currentSection = "overview";
let currentStep = null;

lines.forEach((raw) => {
  const withoutBullet = raw.replace(/^-+\s*/, "");
  const lower = withoutBullet.toLowerCase();

  if (lower.startsWith("**overview")) {
    currentSection = "overview";
    return;
  }

  if (lower.startsWith("**key topics")) {
    currentSection = "key";
    return;
  }

  if (lower.startsWith("**revision") || lower.startsWith("**revise")) {
    currentSection = "revision";
    return;
  }

  if (lower.startsWith("**step") || lower.startsWith("step ")) {
    currentSection = "steps";
    currentStep = {
      title: withoutBullet.replace(/\*\*/g, ""),
      bullets: [],
    };
    steps.push(currentStep);
    return;
  }

  if (currentSection === "steps" && currentStep) {
    currentStep.bullets.push(withoutBullet);
  } else if (currentSection === "key") {
    keyTopics.push(withoutBullet.replace(/\*\*/g, ""));
  } else if (currentSection === "revision") {
    revision.push(withoutBullet);
  } else {
    overview.push(withoutBullet);
  }
});

const hasStructuredContent =
  overview.length || steps.length || keyTopics.length || revision.length;

if (!hasStructuredContent) {
  return (
    <ul style={styles.roadmapList}>
      {lines.map((line, index) => (
        <li key={index} style={styles.roadmapItem}>
          {line}
        </li>
      ))}
    </ul>
  );
}

return (
  <div style={styles.roadmapContainer}>
    {overview.length > 0 && (
      <section style={styles.roadmapSection}>
        <h4 style={styles.roadmapSectionTitle}>Overview</h4>
        {overview.map((text, idx) => (
          <p key={idx} style={styles.roadmapParagraph}>
            {text}
          </p>
        ))}
      </section>
    )}

    {steps.length > 0 && (
      <section style={styles.roadmapSection}>
        <h4 style={styles.roadmapSectionTitle}>Steps</h4>
        <div style={styles.roadmapStepsGrid}>
          {steps.map((step, idx) => (
            <div key={idx} style={styles.roadmapStepCard}>
              <div style={styles.roadmapStepHeader}>{step.title}</div>
              <ul style={styles.roadmapList}>
                {step.bullets.map((bullet, i) => (
                  <li key={i} style={styles.roadmapItem}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )}

    {keyTopics.length > 0 && (
      <section style={styles.roadmapSection}>
        <h4 style={styles.roadmapSectionTitle}>Key Topics</h4>
        <div style={styles.roadmapChipRow}>
          {keyTopics.map((topic, idx) => (
            <span key={idx} style={styles.roadmapChip}>
              {topic}
            </span>
          ))}
        </div>
      </section>
    )}

    {revision.length > 0 && (
      <section style={styles.roadmapSection}>
        <h4 style={styles.roadmapSectionTitle}>Revision &amp; Practice</h4>
        <ul style={styles.roadmapList}>
          {revision.map((item, idx) => (
            <li key={idx} style={styles.roadmapItem}>
              {item}
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>
);
};

useEffect(() => {
fetchHistory();
}, []);

useEffect(() => {
if (history.length > 0 && messages.length === 0) {
  loadChat(history[0]);
}
}, [history]);

useEffect(() => {
if (typeof window === "undefined") return undefined;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  setMicSupported(false);
  return undefined;
}

setMicSupported(true);

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";

recognition.onstart = () => {
  isStartingRef.current = false;
  isStoppingRef.current = false;
  networkRetryCountRef.current = 0;
  setIsListening(true);
  setMicError("");
};

recognition.onresult = (event) => {
  let finalTranscript = finalTranscriptRef.current;
  let interimTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const transcript = event.results[i][0]?.transcript || "";
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
    } else {
      interimTranscript += transcript;
    }
  }

  finalTranscriptRef.current = finalTranscript;
  setPrompt(`${basePromptRef.current}${finalTranscript}${interimTranscript}`.trim());
};

recognition.onerror = (event) => {
  isStartingRef.current = false;

  if (event.error === "aborted" && isStoppingRef.current) {
    setMicError("");
    return;
  }

  if (event.error === "not-allowed" || event.error === "service-not-allowed") {
    setMicError("Microphone access was blocked. Allow mic permission and try again.");
  } else if (event.error === "audio-capture") {
    setMicError("No microphone was detected. Check your input device and try again.");
  } else if (event.error === "no-speech") {
    setMicError("No speech detected. Try again.");
  } else if (event.error === "network") {
    if (!navigator.onLine) {
      setMicError("You appear to be offline. Reconnect to the internet and try voice input again.");
    } else if (networkRetryCountRef.current < 1 && !isStoppingRef.current) {
      networkRetryCountRef.current += 1;
      setMicError("Voice service disconnected. Retrying...");

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        if (!recognitionRef.current || isStoppingRef.current) {
          return;
        }

        try {
          isStartingRef.current = true;
          recognitionRef.current.start();
        } catch {
          isStartingRef.current = false;
          setMicError("Voice input could not restart. Try again.");
        }
      }, 700);
    } else {
      setMicError("Your browser's speech service is unavailable. Try Chrome or Edge with internet access.");
    }
  } else if (event.error === "language-not-supported") {
    setMicError("This language is not supported for voice input in your browser.");
  } else {
    setMicError("Voice input failed. Try again.");
  }
  setIsListening(false);
};

recognition.onend = () => {
  isStartingRef.current = false;
  isStoppingRef.current = false;
  setIsListening(false);
};

recognitionRef.current = recognition;

return () => {
  if (retryTimeoutRef.current) {
    clearTimeout(retryTimeoutRef.current);
  }
  isStartingRef.current = false;
  isStoppingRef.current = true;
  recognition.stop();
  recognitionRef.current = null;
};
}, []);

useEffect(() => {
if (!recognitionRef.current) return;
recognitionRef.current.lang = language === "hindi" ? "hi-IN" : "en-US";
}, [language]);

const fetchHistory = async () => {
try {
const res = await API.get("/chat/history");
setHistory(res.data);
} catch (err) {
console.error(err);
}
};

const loadChat = (chat) => {
  // Prefer new conversation-style messages if available
  setActiveChatId(chat._id);
  if (Array.isArray(chat.messages) && chat.messages.length) {
    const mapped = chat.messages.map((m) => {
      if (m.role === "user") {
        return { role: "user", content: m.content };
      }
      // assistant
      return {
        role: "assistant",
        roadmap: m.roadmap ?? m.content,
        videos: m.recommendedVideos || [],
      };
    });
    setMessages(mapped);
    return;
  }

  // Fallback for legacy chats without messages array
  setMessages([
    { role: "user", content: chat.message },
    {
      role: "assistant",
      roadmap: chat.response.roadmap,
      videos: chat.response.recommendedVideos || [],
    },
  ]);
};

const handleGenerate = async () => {
if (!prompt.trim()) return;

const promptToSend = prompt;
const fileToSend = file;
isStoppingRef.current = true;
recognitionRef.current?.stop();
finalTranscriptRef.current = "";
basePromptRef.current = "";
setPrompt("");
setFile(null);

const userMessage = {
  role: "user",
  content: promptToSend,
};

setMessages((prev) => [...prev, userMessage]);

try {
  setLoading(true);

  let res;

  if (fileToSend) {
    const formData = new FormData();
    formData.append("prompt", promptToSend);
    formData.append("file", fileToSend);
    if (activeChatId) {
      formData.append("chatId", activeChatId);
    }
    formData.append("language", language);

    res = await API.post("/chat/generate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    res = await API.post("/chat/generate", {
      prompt: promptToSend,
      chatId: activeChatId,
      language,
    });
  }

  const aiMessage = {
    role: "assistant",
    roadmap: res.data.roadmap,
    videos: res.data.recommendedVideos || [],
  };

  setMessages((prev) => [...prev, aiMessage]);

  if (res.data.chatId) {
    setActiveChatId(res.data.chatId);
  }
  fetchHistory();
} catch {
  alert("Failed to generate plan");
} finally {
  setLoading(false);
}

};

const deleteChat = async (id) => {
try {
await API.delete(`/chat/${id}`);
fetchHistory();
setMessages([]);
} catch (err) {
console.error("Delete error:", err);
}
};

const handleLogout = () => {
localStorage.removeItem("token");
window.location.href = "/login";
};

const handleNewChat = () => {
if (retryTimeoutRef.current) {
  clearTimeout(retryTimeoutRef.current);
}
isStoppingRef.current = true;
recognitionRef.current?.stop();
setMessages([]);
setPrompt("");
setFile(null);
setActiveChatId(null);
setMicError("");
finalTranscriptRef.current = "";
basePromptRef.current = "";
};

const toggleListening = () => {
if (!recognitionRef.current || !micSupported) {
  setMicError("Voice input is not supported in this browser.");
  return;
}

if (isListening) {
  if (retryTimeoutRef.current) {
    clearTimeout(retryTimeoutRef.current);
  }
  isStoppingRef.current = true;
  recognitionRef.current.stop();
  return;
}

if (isStartingRef.current) {
  return;
}

basePromptRef.current = prompt.trim() ? `${prompt.trim()} ` : "";
finalTranscriptRef.current = "";
setMicError("");
isStartingRef.current = true;
isStoppingRef.current = false;
networkRetryCountRef.current = 0;

try {
  recognitionRef.current.start();
} catch {
  isStartingRef.current = false;
  setMicError("Voice input is already starting.");
}
};

return ( <GlowLayout> <div style={styles.container}>
    {/* Sidebar */}
    <div
      style={{
        ...styles.sidebar,
        width: sidebarOpen ? "25%" : "0",
        padding: sidebarOpen ? "20px" : "0",
        opacity: sidebarOpen ? 1 : 0,
        pointerEvents: sidebarOpen ? "auto" : "none",
      }}
    >
      {sidebarOpen && (
        <>
          <h2 style={styles.sidebarTitle}>History</h2>

          {history.map((chat) => (
            <div
              key={chat._id}
              style={styles.historyItem}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateX(6px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateX(0px)")
              }
            >
              <p
                style={styles.historyText}
                onClick={() => loadChat(chat)}
              >
                {(chat.message || "Conversation").substring(0, 40)}...
              </p>

              <button
                style={styles.deleteBtn}
                onClick={() => deleteChat(chat._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </>
      )}
    </div>

    {/* Main Section */}
    <div
      style={{
        ...styles.main,
        width: sidebarOpen ? "75%" : "100%",
      }}
    >

      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button
            type="button"
            style={styles.sidebarToggle}
            onClick={() => setSidebarOpen((prev) => !prev)}
            title={sidebarOpen ? "Hide history" : "Show history"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <h1 style={styles.heading}>Welcome {storedName}</h1>
        </div>

        <div style={styles.topBarRight}>
          <button style={styles.newChatButton} onClick={handleNewChat}>
            + New Chat
          </button>
          <button
            type="button"
            style={styles.tipsToggle}
            onClick={() => setShowTips((prev) => !prev)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.75V16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.25A7 7 0 0 0 12 2Z" />
            </svg>
            <span style={styles.tipsToggleText}>Must read</span>
          </button>

          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>

          <div
            style={styles.profileAvatar}
            onClick={() => alert(storedEmail)}
            title={storedEmail}
          >
            {userInitial}
          </div>
        </div>
      </div>

      {showTips && (
        <div style={styles.tipsCard}>
          <div style={styles.tipsCardHeader}>
            <span>Prompt tips</span>
            <button
              type="button"
              onClick={() => setShowTips(false)}
              style={styles.tipsClose}
            >
              ×
            </button>
          </div>
          <ul style={styles.tipsList}>
            <li>State your subject and exam or goal clearly.</li>
            <li>Mention total time available (hours or days).</li>
            <li>Add your current level (beginner / intermediate).</li>
            <li>Upload focused notes or syllabus PDFs, not whole books.</li>
            <li>Ask for step-by-step blocks with time per step.</li>
          </ul>
        </div>
      )}

      {/* Chat Window */}
      <div style={styles.chatWindow}>
        {messages.map((msg, index) => {

          if (msg.role === "user") {
            return (
              <div key={index} style={styles.userBubble}>
                {msg.content}
              </div>
            );
          }

          return (
            <div key={index} style={styles.aiBubble}>

              <h3>Study Roadmap</h3>
              {renderRoadmap(msg.roadmap)}

              {msg.videos?.length > 0 && (
                <div>
                  <h3>Recommended Videos</h3>

                  {msg.videos.map((video, i) => {
                    const videoId = video.url.split("v=")[1]?.split("&")[0];
                    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                    return (
                      <div key={i} style={styles.videoCardModern}>
                        <img
                          src={thumbnail}
                          alt="thumbnail"
                          style={styles.thumbnail}
                        />

                        <div style={styles.videoInfo}>
                          <h4>{video.title}</h4>
                          <p>{video.durationMinutes} mins</p>
                          <p>Score: {video.score}</p>

                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.watchBtn}
                          >
                            ▶ Watch
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Prompt Box */}
      <div style={styles.promptBox}>
        <textarea
          placeholder="Ask Acadify anything about your study plan..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={styles.textarea}
        />
        <button
          type="button"
          onClick={toggleListening}
          disabled={!micSupported}
          style={{
            ...styles.micButton,
            ...(isListening ? styles.micButtonActive : {}),
            ...(!micSupported ? styles.micButtonDisabled : {}),
          }}
          title={micSupported ? (isListening ? "Stop voice input" : "Start voice input") : "Voice input not supported"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <path d="M12 19v3" />
            <path d="M8 22h8" />
          </svg>
        </button>
      </div>

      {(isListening || micError || !micSupported) && (
        <div style={styles.micStatus}>
          {isListening
            ? "Listening for your prompt..."
            : micError || "Voice input is not supported in this browser."}
        </div>
      )}

      <div style={styles.languageRow}>
        <span style={styles.languageLabel}>Video language:</span>
        <div style={styles.languageButtons}>
          <button
            type="button"
            onClick={() => setLanguage("english")}
            style={{
              ...styles.languageButton,
              ...(language === "english" ? styles.languageButtonActive : {}),
            }}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("hindi")}
            style={{
              ...styles.languageButton,
              ...(language === "hindi" ? styles.languageButtonActive : {}),
            }}
          >
            Hindi
          </button>
        </div>
      </div>

      <div style={styles.actionsRow}>
        <button
          type="button"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={styles.attachButton}
          title="Attach PDF or image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05 12 20.5a5 5 0 0 1-7.07-7.07l9.19-9.19A3.5 3.5 0 1 1 19 8.12L9.88 17.25a2 2 0 1 1-2.83-2.83L15.07 6.4" />
          </svg>
        </button>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={styles.generateBtn}
        >
          {loading ? "Generating..." : "Send Prompt"}
        </button>
      </div>

      {file && (
        <div style={styles.fileInfo}>
          <span style={styles.fileLabel}>Attached:</span>
          <span style={styles.fileName}>{file.name}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={(e) => setFile(e.target.files[0] || null)}
        style={styles.fileInput}
      />

    </div>
  </div>
  </GlowLayout>
);
};

const styles = {
container: {
display: "flex",
minHeight: "100vh",
padding: "30px",
gap: "30px",
},

sidebar: {
width: "25%",
background: "rgba(255,255,255,0.05)",
backdropFilter: "blur(10px)",
padding: "20px",
borderRadius: "20px",
boxShadow: "0 0 25px rgba(0,150,255,0.3)",
overflowY: "auto",
transition: "width 0.3s ease, padding 0.3s ease, opacity 0.3s ease",
},

sidebarTitle: {
marginBottom: "20px",
},

historyItem: {
padding: "12px",
marginBottom: "12px",
background: "rgba(255,255,255,0.08)",
borderRadius: "12px",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
transition: "all 0.25s ease",
},

historyText: {
cursor: "pointer",
fontSize: "14px",
},

deleteBtn: {
background: "#ff4d4d",
border: "none",
padding: "6px 10px",
borderRadius: "6px",
color: "white",
cursor: "pointer",
},

newChatButton: {
padding: "8px 14px",
borderRadius: "999px",
border: "none",
background: "linear-gradient(90deg,#00c6ff,#0072ff)",
color: "white",
fontWeight: "600",
cursor: "pointer",
},

profileAvatar: {
width: "32px",
height: "32px",
borderRadius: "999px",
background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
display: "flex",
alignItems: "center",
justifyContent: "center",
color: "white",
fontWeight: 600,
fontSize: "14px",
},

main: {
width: "75%",
display: "flex",
flexDirection: "column",
position: "relative",
transition: "width 0.3s ease",
},

topBar: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "20px",
},

topBarLeft: {
display: "flex",
alignItems: "center",
gap: "10px",
},

topBarRight: {
display: "flex",
alignItems: "center",
gap: "10px",
},

heading: {
fontSize: "28px",
},

logoutBtn: {
padding: "8px 16px",
borderRadius: "20px",
border: "none",
background: "#ff4d4d",
color: "white",
cursor: "pointer",
},

tipsToggle: {
display: "flex",
alignItems: "center",
gap: "6px",
padding: "6px 10px",
borderRadius: "999px",
border: "1px solid rgba(0,150,255,0.6)",
background: "rgba(0,0,0,0.3)",
color: "white",
cursor: "pointer",
fontSize: "13px",
},

tipsToggleText: {
fontWeight: 500,
},

sidebarToggle: {
width: "38px",
height: "38px",
borderRadius: "999px",
border: "1px solid rgba(0,150,255,0.6)",
background: "rgba(0,0,0,0.4)",
color: "white",
display: "flex",
alignItems: "center",
justifyContent: "center",
cursor: "pointer",
},

chatWindow: {
flex: 1,
display: "flex",
flexDirection: "column",
gap: "15px",
marginBottom: "20px",
},

userBubble: {
alignSelf: "flex-end",
background: "#0072ff",
padding: "12px 18px",
borderRadius: "20px",
maxWidth: "60%",
},

aiBubble: {
alignSelf: "flex-start",
background: "rgba(255,255,255,0.08)",
padding: "15px",
borderRadius: "15px",
maxWidth: "80%",
},

promptBox: {
position: "relative",
marginBottom: "10px",
},

textarea: {
width: "100%",
padding: "15px",
paddingRight: "64px",
borderRadius: "10px",
border: "none",
outline: "none",
background: "rgba(255,255,255,0.1)",
color: "white",
resize: "vertical",
minHeight: "110px",
},

micButton: {
position: "absolute",
right: "14px",
bottom: "14px",
width: "40px",
height: "40px",
borderRadius: "999px",
border: "1px solid rgba(255,255,255,0.14)",
background: "rgba(255,255,255,0.1)",
color: "white",
display: "flex",
alignItems: "center",
justifyContent: "center",
cursor: "pointer",
transition: "all 0.2s ease",
backdropFilter: "blur(6px)",
},

micButtonActive: {
background: "linear-gradient(135deg,#ef4444,#ec4899)",
border: "1px solid transparent",
boxShadow: "0 0 18px rgba(239,68,68,0.35)",
},

micButtonDisabled: {
opacity: 0.45,
cursor: "not-allowed",
},

micStatus: {
marginBottom: "8px",
fontSize: "12px",
color: "rgba(255,255,255,0.75)",
},

actionsRow: {
display: "flex",
justifyContent: "flex-end",
alignItems: "center",
gap: "10px",
},

languageRow: {
marginTop: "8px",
marginBottom: "4px",
display: "flex",
alignItems: "center",
gap: "8px",
fontSize: "13px",
opacity: 0.9,
},

languageLabel: {
},

languageButtons: {
display: "flex",
gap: "6px",
},

languageButton: {
padding: "4px 10px",
borderRadius: "999px",
border: "1px solid rgba(255,255,255,0.3)",
background: "transparent",
color: "white",
cursor: "pointer",
fontSize: "12px",
},

languageButtonActive: {
background: "linear-gradient(90deg,#00c6ff,#0072ff)",
borderColor: "transparent",
},

attachButton: {
width: "38px",
height: "38px",
borderRadius: "999px",
border: "none",
display: "flex",
alignItems: "center",
justifyContent: "center",
background: "rgba(255,255,255,0.12)",
color: "white",
cursor: "pointer",
},

generateBtn: {
padding: "8px 18px",
borderRadius: "20px",
border: "none",
background: "linear-gradient(90deg,#00c6ff,#0072ff)",
color: "white",
cursor: "pointer",
minWidth: "140px",
},

fileInput: {
display: "none",
},

fileInfo: {
marginTop: "8px",
fontSize: "12px",
opacity: 0.85,
},

fileLabel: {
fontWeight: 500,
marginRight: "4px",
},

fileName: {
fontWeight: 400,
},

pre: {
whiteSpace: "pre-wrap",
},

roadmapContainer: {
marginTop: "8px",
display: "flex",
flexDirection: "column",
gap: "14px",
},

roadmapSection: {
background: "rgba(0,0,0,0.25)",
borderRadius: "12px",
padding: "10px 12px",
border: "1px solid rgba(0,150,255,0.35)",
},

roadmapSectionTitle: {
fontSize: "16px",
fontWeight: 600,
marginBottom: "6px",
},

roadmapParagraph: {
margin: 0,
lineHeight: 1.6,
fontSize: "15px",
},

roadmapList: {
listStyleType: "disc",
paddingLeft: "20px",
marginTop: "10px",
display: "flex",
flexDirection: "column",
gap: "6px",
},

roadmapItem: {
lineHeight: 1.6,
fontSize: "15px",
},

roadmapStepsGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
gap: "10px",
},

roadmapStepCard: {
background: "rgba(0,0,0,0.35)",
borderRadius: "10px",
padding: "10px",
borderLeft: "3px solid #00c6ff",
},

roadmapStepHeader: {
fontWeight: 600,
marginBottom: "4px",
fontSize: "15px",
},

roadmapChipRow: {
display: "flex",
flexWrap: "wrap",
gap: "8px",
marginTop: "4px",
},

roadmapChip: {
padding: "4px 10px",
borderRadius: "999px",
background: "rgba(0,150,255,0.18)",
border: "1px solid rgba(0,150,255,0.45)",
fontSize: "13px",
},

tipsCard: {
position: "absolute",
top: "60px",
right: "10px",
width: "280px",
background: "rgba(5,12,40,0.95)",
borderRadius: "14px",
padding: "12px 14px",
boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
border: "1px solid rgba(0,150,255,0.5)",
backdropFilter: "blur(14px)",
zIndex: 10,
},

tipsCardHeader: {
display: "flex",
alignItems: "center",
justifyContent: "space-between",
marginBottom: "8px",
fontSize: "14px",
fontWeight: 600,
},

tipsClose: {
border: "none",
background: "transparent",
color: "white",
cursor: "pointer",
fontSize: "18px",
lineHeight: 1,
},

tipsList: {
margin: 0,
paddingLeft: "18px",
display: "flex",
flexDirection: "column",
gap: "4px",
fontSize: "13px",
},

videoCardModern: {
marginTop: "15px",
display: "flex",
gap: "15px",
background: "rgba(255,255,255,0.08)",
padding: "12px",
borderRadius: "12px",
alignItems: "center",
},

thumbnail: {
width: "200px",
borderRadius: "10px",
},

videoInfo: {
flex: 1,
},

watchBtn: {
display: "inline-block",
marginTop: "6px",
padding: "8px 14px",
borderRadius: "20px",
background: "linear-gradient(90deg,#00c6ff,#0072ff)",
color: "white",
textDecoration: "none",
},
};

export default Dashboard;
