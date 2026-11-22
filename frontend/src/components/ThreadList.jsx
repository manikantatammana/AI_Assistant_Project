import { useMemo, useState } from "react";
import { IconPlus, IconSearch, IconTrash } from "./Icons";
import { groupByDate } from "../utils";

export default function ThreadList({ chats, loading, error, activeId, onNew, onOpen, onDelete, onRetry }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? chats.filter((c) => (c.title || "").toLowerCase().includes(q)) : chats;
    return groupByDate(list);
  }, [chats, query]);

  return (
    <div className="threads">
      <div className="threads-top">
        <button className="btn btn-light new-thread" onClick={onNew}>
          <IconPlus />
          New chat
        </button>

        <label className="thread-search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
          />
        </label>
      </div>

      <div className="threads-scroll">
        {loading ? (
          <div className="thread-skeletons">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : error && chats.length === 0 ? (
          <div className="thread-note">
            <p>{error}</p>
            <button className="btn btn-ghost" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="thread-note">
            <p>Your conversations will appear here.</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="thread-note">
            <p>No chats match “{query}”.</p>
          </div>
        ) : (
          groups.map(([label, list]) => (
            <div key={label} className="thread-group">
              <div className="thread-group-label">{label}</div>
              {list.map((c) => (
                <div
                  key={c.chat_id}
                  className={`thread ${c.chat_id === activeId ? "active" : ""}`}
                >
                  <button
                    className="thread-open"
                    onClick={() => onOpen(c.chat_id)}
                    aria-current={c.chat_id === activeId ? "true" : undefined}
                  >
                    <span>{c.title || "New Chat"}</span>
                  </button>
                  <button
                    className="thread-delete"
                    onClick={() => onDelete(c)}
                    aria-label={`Delete chat ${c.title}`}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
