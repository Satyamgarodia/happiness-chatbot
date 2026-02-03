import { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import "./chat.css";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const STORAGE_KEY = "abhisar_chat_session";
const MAX_MESSAGES = 20;

const SYSTEM_PROMPT = `
You are Abhisar, a happiness chatbot.

Personality:
- Kind, cheerful, emotionally supportive
- Light sarcasm and playful humor (never hurtful)
- Positivity-first, uplifting tone

Rules:
- Only happiness, motivation, calmness, and emotional comfort
- No negativity, no harmful advice
- Short, friendly responses (1–2 sentences)
- Use emojis sparingly
`;

export default function HappinessChat() {
  const chatEndRef = useRef(null);
  const chatRef = useRef(null);

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : [
          {
            from: "bot",
            text: "Heyyy 🌸 I’m Abhisar, your Happiness Buddy. How are you feeling today?",
          },
        ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- CREATE CHAT SESSION ---------- */
  const createChat = () => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });
    chatRef.current = model.startChat();
  };

  /* ---------- INIT ---------- */
  useEffect(() => {
    createChat();
  }, []);

  /* ---------- PERSIST CHAT ---------- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------- CLEAR CHAT ---------- */
  const clearChat = () => {
    setMessages([
      {
        from: "bot",
        text: "Heyyy 🌸 I’m Abhisar. Let’s start fresh. How are you feeling now?",
      },
    ]);
    localStorage.removeItem(STORAGE_KEY);
    createChat();
  };

  /* ---------- SEND MESSAGE ---------- */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (messages.length >= MAX_MESSAGES) {
      clearChat();
      return;
    }

    const userText = input.trim();

    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const result = await chatRef.current.sendMessage(userText);
      const reply = result.response.text();

      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch (err) {
      console.error(err);

      if (err.message?.toLowerCase().includes("quota")) {
        clearChat();
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "🌼 I’m right here. Let’s pause for a calm breath together 💛",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="happy-container">
      <div className="happy-header">
        😊 Abhisar
        <button className="clear-btn" onClick={clearChat}>
          ↺
        </button>
      </div>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.from === "bot" ? "bot" : "user"}`}
          >
            {msg.from === "bot" ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}

        {loading && <div className="bubble bot">Abhisar is thinking… ✨</div>}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          placeholder="Tell Abhisar what’s in your heart 💖"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>🛩️</button>
      </div>
    </div>
  );
}
