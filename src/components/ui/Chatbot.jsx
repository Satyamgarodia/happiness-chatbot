import { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./chat.css";
import ReactMarkdown from "react-markdown";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const STORAGE_KEY = "abhisar_chat_session";

export default function HappinessChat() {
  // UI messages (can include bot greeting)
  const chatEndRef = useRef(null);

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
  const chatRef = useRef(null);

  /* ---------- INIT GEMINI CHAT (NO HISTORY) ---------- */
  useEffect(() => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
You are Abhisar, a happiness-focused chatbot.
Always be kind, calm, cheerful, emotionally supportive, and positive.
You ONLY give happiness, motivation, emotional comfort, and positivity advice.
Never give negative, harmful, or neutral responses.
Keep responses concise and engaging.
Keep Messages short when ever possible.
Use emojis gently.
This chatbot is made by Satyam Garodia & Jay Joshi.
This is a Private Custom Made Bot Not a Public One.
      `,
    });

    chatRef.current = model.startChat(); // 🔥 no history
  }, []);

  /* ---------- SAVE UI CHAT LOCALLY ---------- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  /* ---------- SEND MESSAGE ---------- */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;

    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const result = await chatRef.current.sendMessage(userText);
      const reply = result.response.text();

      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "🌼 I’m right here with you. Let’s take a calm breath together 💛",
        },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="happy-container">
      <div className="happy-header">😊 Abhisar</div>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.from === "bot" ? "bot" : "user"}`}
          >
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600 }}>{children}</strong>
                ),
                p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                li: ({ children }) => (
                  <li style={{ marginLeft: "16px" }}>{children}</li>
                ),
              }}
            >
              {msg.text}
            </ReactMarkdown>
          </div>
        ))}

        {loading && <div className="bubble bot">Abhisar is thinking… ✨</div>}
      </div>
      <div ref={chatEndRef} />
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
