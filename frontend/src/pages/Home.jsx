import { useState } from "react";
import Rail from "../components/Rail";
import { IconArrowRight, IconChat, IconDoc, IconSend } from "../components/Icons";
import { useLibrary } from "../hooks/useLibrary";
import { formatDate, greeting, timeAgo } from "../utils";

export const PENDING_PROMPT_KEY = "pendingPrompt";

const QUICK_STARTS = [
  "Explain a hard topic in simple words",
  "Help me write a polite email",
  "Plan my study week",
  "Give me interview practice questions",
];

export default function Home({ navigate }) {
  const { chats, resumes, chatsLoading, resumesLoading } = useLibrary();
  const [prompt, setPrompt] = useState("");

  const startChat = (text) => {
    const value = (text ?? prompt).trim();
    if (value) sessionStorage.setItem(PENDING_PROMPT_KEY, value);
    navigate("chat");
  };

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero container">
        <p className="eyebrow">{greeting()}</p>
        <h1 className="hero-title">
          What are we
          <br />
          working on today?
        </h1>

        <form
          className="hero-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            startChat();
          }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything…"
            aria-label="Ask the assistant"
            maxLength={4000}
          />
          <button
            type="submit"
            className="hero-send"
            aria-label={prompt.trim() ? "Start chat" : "Open chat"}
          >
            <IconSend />
          </button>
        </form>

        <div className="quick-starts">
          {QUICK_STARTS.map((q) => (
            <button key={q} onClick={() => startChat(q)}>
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Two primary tools ---------- */}
      <section className="container tools">
        <button className="tool" onClick={() => navigate("chat")}>
          <span className="tool-icon">
            <IconChat />
          </span>
          <span className="tool-body">
            <span className="tool-title">Chat</span>
            <span className="tool-text">
              Ask questions, think through ideas, get clear answers. Every conversation is saved.
            </span>
          </span>
          <IconArrowRight className="tool-arrow" />
        </button>

        <button className="tool" onClick={() => navigate("resume")}>
          <span className="tool-icon">
            <IconDoc />
          </span>
          <span className="tool-body">
            <span className="tool-title">Resume Analyzer</span>
            <span className="tool-text">
              Upload a PDF and get a plain-English review: strengths, gaps and what to fix first.
            </span>
          </span>
          <IconArrowRight className="tool-arrow" />
        </button>
      </section>

      {/* ---------- Rails ---------- */}
      <div className="container rails">
        <Rail title="Continue a conversation" count={chats.length || null}>
          {chatsLoading ? (
            <SkeletonCards kind="chat" />
          ) : chats.length === 0 ? (
            <EmptyCard
              title="No conversations yet"
              text="Ask something above and it will show up here."
              onClick={() => navigate("chat")}
              cta="Start chatting"
            />
          ) : (
            chats.slice(0, 20).map((c) => (
              <button
                key={c.chat_id}
                className="card chat-card"
                onClick={() => navigate(`chat/${c.chat_id}`)}
              >
                <span className="chat-card-icon">
                  <IconChat />
                </span>
                <span className="chat-card-title">{c.title || "New Chat"}</span>
                <span className="card-meta">{timeAgo(c.updated_at)}</span>
              </button>
            ))
          )}
        </Rail>

        <Rail title="Your resumes" count={resumes.length || null}>
          {resumesLoading ? (
            <SkeletonCards kind="poster" />
          ) : resumes.length === 0 ? (
            <EmptyCard
              title="No resumes analysed"
              text="Upload one and the report will be kept here."
              onClick={() => navigate("resume")}
              cta="Upload a resume"
            />
          ) : (
            resumes.slice(0, 20).map((r) => (
              <button
                key={r.resume_id}
                className="card poster"
                onClick={() => navigate(`resume/${r.resume_id}`)}
              >
                <span className="poster-top">PDF</span>
                <span className="poster-lines" aria-hidden="true">
                  <i style={{ width: "46%" }} />
                  <i style={{ width: "82%" }} />
                  <i style={{ width: "70%" }} />
                  <i style={{ width: "76%" }} />
                  <i style={{ width: "38%" }} />
                </span>
                <span className="poster-name">{r.filename}</span>
                <span className="card-meta">{formatDate(r.created_at)}</span>
              </button>
            ))
          )}
        </Rail>
      </div>
    </div>
  );
}

function EmptyCard({ title, text, onClick, cta }) {
  return (
    <div className="empty-card">
      <strong>{title}</strong>
      <span>{text}</span>
      <button className="btn btn-ghost" onClick={onClick}>
        {cta}
      </button>
    </div>
  );
}

function SkeletonCards({ kind }) {
  return Array.from({ length: 4 }, (_, i) => (
    <div key={i} className={`card skeleton sk-${kind}`} />
  ));
}
