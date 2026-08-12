import React, { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  confidence?: number;
  time: string;
  needsTeaching?: boolean;
  queryToTeach?: string;
  taught?: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "👋 Hello! I am Bunno JS. Ask me anything, test my math adapter, or teach me new answers!",
      sender: "bot",
      time: "System initialized",
    },
  ]);
  const [input, setInput] = useState("");
  const [teachInputs, setTeachInputs] = useState<Record<string, string>>({});
  const [dbCount, setDbCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setDbCount(data.count);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendPrompt = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: `Error: ${data.error}`,
            sender: "bot",
            time: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: "bot",
          confidence: data.confidence,
          time: new Date().toLocaleTimeString(),
          needsTeaching: data.needsTeaching,
          queryToTeach: data.queryToTeach,
        },
      ]);

      if (data.dbCount !== undefined) {
        setDbCount(data.dbCount);
      }
    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Network error occurred.",
          sender: "bot",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  const handleTeachSubmit = async (msgId: string, query: string) => {
    const answer = teachInputs[msgId];
    if (!answer || !answer.trim()) return;

    try {
      const res = await fetch("/api/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, answer }),
      });

      const data = await res.json();
      if (data.success) {
        setDbCount(data.dbCount);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  needsTeaching: false,
                  text: `✅ ${data.message}`,
                  confidence: 1.0,
                }
              : m
          )
        );
      }
    } catch (e) {
      alert("Failed to save answer");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  const trainCorpus = async (name: string) => {
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corpus: name }),
      });
      const data = await res.json();
      if (data.success) {
        setDbCount(data.count);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: `System: Trained corpus '${name}'. Database updated to ${data.count} statements.`,
            sender: "bot",
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (e) {
      alert("Failed to train corpus");
    }
  };

  const clearDb = async () => {
    if (!confirm("Are you sure you want to reset the SQLite database?")) return;
    try {
      const res = await fetch("/api/clear", { method: "POST" });
      const data = await res.json();
      setDbCount(data.count);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "System: SQLite Database reset to default state.",
          sender: "bot",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (e) {
      alert("Failed to clear database");
    }
  };

  return (
    <div style={styles.body}>
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <div style={styles.logoIcon}>⚡</div>
          <div>
            <div style={styles.logoTitle}>Bunno JS</div>
            <div style={styles.logoSubtitle}>Interactive Teaching Engine</div>
          </div>
        </div>
        <div style={styles.statsBadge}>
          <div style={styles.dbDot}></div>
          <span>SQLite DB: <strong>{dbCount}</strong> statements</span>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.chatContainer}>
          <div style={styles.messagesList}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.messageWrapper,
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    background: m.sender === "user" ? "#3b82f6" : "#334155",
                    borderBottomRightRadius: m.sender === "user" ? 4 : 16,
                    borderBottomLeftRadius: m.sender === "bot" ? 4 : 16,
                  }}
                >
                  {m.text}
                </div>
                {m.metaInfo || (
                  <div style={styles.metaInfo}>
                    <span>{m.time}</span>
                    {m.confidence !== undefined && (
                      <span style={styles.confidenceTag}>
                        Confidence: {(m.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}

                {m.needsTeaching && m.queryToTeach && (
                  <div style={styles.teachCard}>
                    <div style={styles.teachTitle}>
                      💡 Teach the bot! What should I reply to "{m.queryToTeach}"?
                    </div>
                    <div style={styles.teachForm}>
                      <input
                        type="text"
                        placeholder="Type the correct answer..."
                        value={teachInputs[m.id] || ""}
                        onChange={(e) =>
                          setTeachInputs((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        style={styles.teachInput}
                      />
                      <button
                        onClick={() => handleTeachSubmit(m.id, m.queryToTeach!)}
                        style={styles.teachBtn}
                      >
                        Teach Bot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <div style={styles.suggestions}>
              <div style={styles.chip} onClick={() => sendPrompt("Hello there!")}>👋 Say Hello</div>
              <div style={styles.chip} onClick={() => sendPrompt("What time is it?")}>⏰ Ask Time</div>
              <div style={styles.chip} onClick={() => sendPrompt("What is 125 * 8?")}>🧮 Solve 125 * 8</div>
              <div style={styles.chip} onClick={() => sendPrompt("What is Bun?")}>⚡ Ask Bun</div>
              <div style={styles.chip} onClick={() => sendPrompt("How to build a quantum computer?")}>💡 Unknown Query (Test Teach)</div>
            </div>
            <form onSubmit={handleSubmit} style={styles.chatForm}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={styles.chatInput}
                placeholder="Type a message or math query..."
              />
              <button type="submit" style={styles.sendBtn} disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </section>

        <aside style={styles.sidebar}>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>Active Logic Adapters</div>
            <ul style={styles.adapterList}>
              <li style={styles.adapterItem}>MathematicalEvaluation</li>
              <li style={styles.adapterItem}>TimeLogicAdapter</li>
              <li style={styles.adapterItem}>BestMatch (Levenshtein)</li>
            </ul>
          </div>

          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>Corpus Training</div>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
              Train the chatbot with built-in conversational datasets.
            </p>
            <button style={styles.actionBtn} onClick={() => trainCorpus("greetings")}>Train Greetings</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("conversations")}>Train Conversations</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("ai")}>Train AI Knowledge</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("computers")}>Train Computers & Tech</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("science")}>Train Science & Universe</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("psychology")}>Train Psychology</button>
            <button style={styles.actionBtn} onClick={() => trainCorpus("trivia")}>Train General Trivia</button>
          </div>

          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>Storage Controls</div>
            <button style={{ ...styles.actionBtn, ...styles.dangerBtn }} onClick={clearDb}>
              Reset SQLite Database
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Inter', sans-serif",
    background: "#0f172a",
    color: "#f8fafc",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    background: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #334155",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoIcon: {
    width: "38px",
    height: "38px",
    background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "1.2rem",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  logoTitle: {
    fontSize: "1.15rem",
    fontWeight: "700",
    letterSpacing: "-0.02em",
  },
  logoSubtitle: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontFamily: "'JetBrains Mono', monospace",
  },
  statsBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#0f172a",
    padding: "0.4rem 0.8rem",
    borderRadius: "20px",
    border: "1px solid #334155",
    fontSize: "0.85rem",
    fontFamily: "'JetBrains Mono', monospace",
  },
  dbDot: {
    width: "8px",
    height: "8px",
    background: "#10b981",
    borderRadius: "50%",
    boxShadow: "0 0 8px #10b981",
  },
  main: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    height: "calc(100vh - 65px)",
    overflow: "hidden",
  },
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#0b1120",
  },
  messagesList: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  messageWrapper: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "75%",
  },
  messageBubble: {
    padding: "0.85rem 1.15rem",
    borderRadius: "16px",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    wordBreak: "break-word",
    color: "#ffffff",
  },
  metaInfo: {
    fontSize: "0.72rem",
    color: "#94a3b8",
    marginTop: "0.35rem",
    display: "flex",
    gap: "0.5rem",
    fontFamily: "'JetBrains Mono', monospace",
  },
  confidenceTag: {
    color: "#14b8a6",
    fontWeight: 600,
  },
  teachCard: {
    marginTop: "0.5rem",
    background: "#1e293b",
    border: "1px solid #f59e0b",
    padding: "0.85rem",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  teachTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#f59e0b",
  },
  teachForm: {
    display: "flex",
    gap: "0.5rem",
  },
  teachInput: {
    flex: 1,
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#f8fafc",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    outline: "none",
  },
  teachBtn: {
    background: "#f59e0b",
    color: "#0f172a",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  inputArea: {
    padding: "1.25rem 1.5rem",
    background: "#1e293b",
    borderTop: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  suggestions: {
    display: "flex",
    gap: "0.5rem",
    overflowX: "auto",
    paddingBottom: "0.25rem",
  },
  chip: {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#94a3b8",
    padding: "0.35rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chatForm: {
    display: "flex",
    gap: "0.75rem",
  },
  chatInput: {
    flex: 1,
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#f8fafc",
    padding: "0.85rem 1.15rem",
    borderRadius: "12px",
    fontSize: "0.95rem",
    outline: "none",
  },
  sendBtn: {
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "white",
    border: "none",
    padding: "0 1.5rem",
    borderRadius: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  sidebar: {
    background: "#1e293b",
    borderLeft: "1px solid #334155",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    overflowY: "auto",
  },
  panelSection: {
    background: "#0f172a",
    padding: "1rem",
    borderRadius: "12px",
    border: "1px solid #334155",
  },
  panelTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
    marginBottom: "0.75rem",
  },
  adapterList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: 0,
  },
  adapterItem: {
    fontSize: "0.82rem",
    fontFamily: "'JetBrains Mono', monospace",
    color: "#cbd5e1",
    background: "#1e293b",
    padding: "0.4rem 0.6rem",
    borderRadius: "6px",
  },
  actionBtn: {
    width: "100%",
    background: "#334155",
    color: "#f8fafc",
    border: "1px solid #334155",
    padding: "0.65rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  dangerBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    color: "#f87171",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
};
