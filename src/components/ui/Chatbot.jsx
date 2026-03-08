import { useEffect, useRef, useState, useCallback } from "react";
import Groq from "groq-sdk";
import ReactMarkdown from "react-markdown";
import "./chat.css";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

const ACTIVE_KEY  = "abhisar_active";
const HISTORY_KEY = "abhisar_history";
const MAX_CONTEXT = 20;

const MOODS = [
  { emoji: "😄", label: "Happy",    color: "#fff3c4", prompt: "The user is feeling happy today. Match their energy, celebrate with them, keep it fun and light." },
  { emoji: "😌", label: "Calm",     color: "#cce8f5", prompt: "The user is feeling calm. Keep the conversation peaceful, gentle, and grounding." },
  { emoji: "😔", label: "Sad",      color: "#ddd0f7", prompt: "The user is feeling sad. Be extra warm, compassionate, and gently uplifting. Don't rush them." },
  { emoji: "😤", label: "Stressed", color: "#fcd5c8", prompt: "The user is feeling stressed. Help them breathe, slow down, and find calm perspective." },
  { emoji: "😴", label: "Tired",    color: "#d4e8c2", prompt: "The user is feeling tired. Be low-energy, cozy, and comforting. Don't overstimulate." },
  { emoji: "🤩", label: "Excited",  color: "#fde4c0", prompt: "The user is feeling excited! Match their enthusiasm and celebrate together." },
];

function buildSystemPrompt(mood) {
  const base = `You are Abhisar, a happiness chatbot.
Personality: Kind, cheerful, emotionally supportive. Light sarcasm and playful humor (never hurtful). Positivity-first, uplifting tone.
Rules: Only happiness, motivation, calmness, and emotional comfort. No negativity, no harmful advice. Short, friendly responses (1-2 sentences). Use emojis sparingly.
You are made by Satyam Garodia & Jay Joshi. Private bot, not open to public.
If user goes off topic, gently steer them back to happiness and motivation.`;
  return {
    role: "system",
    content: mood ? `${base}\n\nMood context: ${mood.prompt}` : base,
  };
}

const WELCOME = (mood) => ({
  from: "bot",
  text: mood
    ? `${mood.emoji} Feeling **${mood.label}** today — I've got you! Tell me what's on your mind.`
    : "Heyyy 🌸 I'm Abhisar, your Happiness Buddy. How are you feeling today?",
  ts: Date.now(),
});

function newConvo(mood = null) {
  return {
    id: Date.now().toString(),
    title: "New chat",
    messages: [WELCOME(mood)],
    updatedAt: Date.now(),
    mood,
  };
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  const d     = new Date(ts);
  const today = new Date();
  const diff  = today.setHours(0,0,0,0) - d.setHours(0,0,0,0);
  if (diff === 0)        return "Today";
  if (diff === 86400000) return "Yesterday";
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(hist) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

// ── MOOD CHECK-IN SCREEN ────────────────────────────────────────────
function MoodScreen({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(false);

  const choose = (mood) => {
    setSelected(mood);
    setAnimating(true);
    setTimeout(() => onSelect(mood), 600);
  };

  return (
    <div className={`mood-screen ${animating ? "mood-exit" : ""}`}>
      <div className="mood-cloud">☁️</div>
      <h1 className="mood-heading">Hey there 🌸</h1>
      <p className="mood-sub">How are you feeling right now?</p>
      <div className="mood-grid">
        {MOODS.map((m) => (
          <button
            key={m.label}
            className={`mood-card ${selected?.label === m.label ? "selected" : ""}`}
            style={{ "--mood-color": m.color }}
            onClick={() => choose(m)}
          >
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>
      <button className="mood-skip" onClick={() => choose(null)}>
        Skip for now
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────
export default function HappinessChat() {
  const chatEndRef = useRef(null);

  const [history,     setHistory]     = useState(loadHistory);
  const [active,      setActive]      = useState(() => {
    try {
      const id   = localStorage.getItem(ACTIVE_KEY);
      const hist = loadHistory();
      return hist.find(c => c.id === id) || hist[0] || null;
    } catch { return null; }
  });
  const [showMood,    setShowMood]    = useState(() => !localStorage.getItem(ACTIVE_KEY));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (active) localStorage.setItem(ACTIVE_KEY, active.id);
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHistory(prev => {
      const exists  = prev.find(c => c.id === active.id);
      const updated = exists
        ? prev.map(c => c.id === active.id ? { ...active, updatedAt: Date.now() } : c)
        : [{ ...active, updatedAt: Date.now() }, ...prev];
      saveHistory(updated);
      return updated;
    });
  }, [active?.messages]);

  const handleMoodSelect = (mood) => {
    const convo = newConvo(mood);
    setActive(convo);
    setShowMood(false);
  };

  const openConvo = (convo) => {
    setActive(convo);
    setSidebarOpen(false);
  };

  const newChat = useCallback(() => {
    setShowMood(true);
    setSidebarOpen(false);
  }, []);

  const deleteConvo = (e, id) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveHistory(updated);
      return updated;
    });
    if (active?.id === id) newChat();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !active) return;

    const userText    = input.trim();
    const newMessages = [...active.messages, { from: "user", text: userText, ts: Date.now() }];
    const title       = active.title === "New chat"
      ? userText.slice(0, 36) + (userText.length > 36 ? "…" : "")
      : active.title;

    setActive(prev => ({ ...prev, messages: newMessages, title }));
    setInput("");
    setLoading(true);

    const ctx = newMessages
      .slice(-MAX_CONTEXT)
      .map(m => ({ role: m.from === "bot" ? "assistant" : "user", content: m.text }));

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [buildSystemPrompt(active.mood), ...ctx],
        max_tokens: 150,
        temperature: 0.8,
      });
      const reply = completion.choices[0]?.message?.content ?? "💙 I'm here!";
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, { from: "bot", text: reply, ts: Date.now() }],
      }));
    } catch (err) {
      console.error(err);
      setActive(prev => ({
        ...prev,
        messages: [...prev.messages, {
          from: "bot",
          text: "🌼 I'm right here. Let's take a calm breath together 💙",
          ts: Date.now(),
        }],
      }));
    }

    setLoading(false);
  };

  // Show mood screen
  if (showMood) return <MoodScreen onSelect={handleMoodSelect} />;

  return (
    <div className="happy-container">

      {/* ── SIDEBAR OVERLAY ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Chats</span>
          <button className="sidebar-new-btn" onClick={newChat}>＋ New</button>
        </div>
        <div className="sidebar-list">
          {history.length === 0 && <p className="sidebar-empty">No chats yet 💭</p>}
          {history.map(convo => (
            <div
              key={convo.id}
              className={`sidebar-item ${convo.id === active?.id ? "active" : ""}`}
              onClick={() => openConvo(convo)}
            >
              <div className="sidebar-item-inner">
                <div className="sidebar-item-top">
                  {convo.mood && <span className="sidebar-mood-badge">{convo.mood.emoji}</span>}
                  <span className="sidebar-item-title">{convo.title}</span>
                </div>
                <span className="sidebar-item-date">{formatDate(convo.updatedAt)}</span>
              </div>
              <button className="sidebar-delete-btn" onClick={(e) => deleteConvo(e, convo.id)}>✕</button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── HEADER ── */}
      <div className="happy-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(o => !o)}>
          <span /><span /><span />
        </button>
        <div className="header-content">
          <div className="header-avatar">
            {active?.mood ? active.mood.emoji : "☁️"}
          </div>
          <div className="header-text">
            <span className="header-name">Abhisar</span>
            <span className="header-status">
              <span className="status-dot" />
              {active?.mood ? `feeling ${active.mood.label.toLowerCase()}` : "always here for you"}
            </span>
          </div>
        </div>
        <button className="clear-btn" onClick={newChat} title="New chat">↺</button>
      </div>

      {/* ── CHAT ── */}
      <div className="chat-box">
        {active?.mood && (
          <div className="mood-banner" style={{ "--mood-color": active.mood.color }}>
            {active.mood.emoji} {active.mood.label} mode
          </div>
        )}
        <div className="date-divider">Today</div>

        {active?.messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.from === "bot" ? "bot-row" : "user-row"}`}>
            <div className={`bubble ${msg.from === "bot" ? "bot" : "user"}`}>
              {msg.from === "bot"
                ? <ReactMarkdown>{msg.text}</ReactMarkdown>
                : msg.text}
            </div>
            {msg.ts && <span className="bubble-time">{formatTime(msg.ts)}</span>}
          </div>
        ))}

        {loading && (
          <div className="typing-bubble">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── INPUT ── */}
      <div className="input-area">
        <input
          placeholder="Share what's on your mind… 💙"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading}>🛩️</button>
      </div>

    </div>
  );
}