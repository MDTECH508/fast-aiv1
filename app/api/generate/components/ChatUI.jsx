"use client";

import { useEffect, useState } from "react";
import TypingIndicator from "./TypingIndicator";
import ProgressBar from "./ProgressBar";

export default function ChatUI() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [model, setModel] = useState("fast");
  const [sources, setSources] = useState([]);

  function appendMessage(role, text) {
    setMessages((s) => [...s, { id: Date.now() + Math.random(), role, text }]);
  }

  async function submit(e) {
    e?.preventDefault();
    if (!prompt.trim()) return;
    appendMessage("user", prompt);
    setPrompt("");
    setLoading(true);
    setTyping(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model })
      });
      const data = await res.json();
      if (res.ok) {
        appendMessage("assistant", data.response || "Pa gen repons");
        setSources(data.sources || []);
      } else {
        appendMessage("assistant", "Erè: " + (data.error || res.statusText));
      }
    } catch (err) {
      appendMessage("assistant", "Erè rezo: " + String(err));
    } finally {
      setTyping(false);
      setLoading(false);
    }
  }

  return (
    <div className="chat-root">
      <div className="controls glass">
        <label>
          Model:
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="fast">fast v2</option>
            <option value="kirah">kirah v1</option>
            <option value="thalia">thalia v2</option>
          </select>
        </label>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"} glass`}>
            <div className="msg-content">{m.text}</div>
          </div>
        ))}

        {typing && (
          <div className="msg msg-assistant glass typing-row">
            <TypingIndicator />
          </div>
        )}
      </div>

      <ProgressBar active={loading} />

      <form onSubmit={submit} className="composer glass">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ekri kesyon w la..."
          rows={2}
        />
        <div className="composer-actions">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Ap travay..." : "Voye"}
          </button>
        </div>
      </form>

      {sources.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <h3 style={{ color: "#cfe6ff" }}>Sous</h3>
          <ul>
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.link} target="_blank" rel="noreferrer" style={{ color: "#9ec7ff" }}>
                  {s.title}
                </a>
                <div style={{ fontSize: 13, color: "#cfe6ff" }}>{s.snippet}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
