import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconAlert, IconCheck, IconCopy, IconDown, IconMenu, IconRefresh, IconSend } from "../components/Icons";
import Markdown from "../components/Markdown";
import ThreadList from "../components/ThreadList";
import { useToast } from "../components/Toast";
import { useLibrary } from "../hooks/useLibrary";
import { replaceRoute } from "../hooks/useRoute";
import { formatTime } from "../utils";
import { PENDING_PROMPT_KEY } from "./Home";

const SUGGESTIONS = [
  { title: "Explain something simply", text: "Explain how the internet works like I'm new to tech" },
  { title: "Write for me", text: "Write a short, polite email asking my manager for a day off" },
  { title: "Plan my time", text: "Make me a realistic 5-day study plan for learning Python" },
  { title: "Practice interviews", text: "Ask me 5 common interview questions, one at a time" },
];

export default function Chat({ chatId, navigate }) {
  const toast = useToast();
  const { chats, chatsLoading, chatsError, refreshChats, removeChatLocal } = useLibrary();

  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null); // { text, retry }
  const [draft, setDraft] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const stickRef = useRef(true); // stay pinned to bottom unless the user scrolls up
  const activeIdRef = useRef(chatId);
  const justCreatedRef = useRef(null);
  const fromPendingRef = useRef(false);

  activeIdRef.current = chatId;

  /* ---------------- scrolling ---------------- */
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  useEffect(() => {
    if (stickRef.current) scrollToBottom(true);
  }, [messages, sending, scrollToBottom]);

  /* ---------------- sending ---------------- */
  const send = useCallback(
    async (rawText, { isRetry = false } = {}) => {
      const text = rawText.trim();
      if (!text || sending) return;

      setError(null);
      stickRef.current = true;

      if (!isRetry) {
        setMessages((m) => [...m, { role: "user", content: text, created_at: new Date().toISOString() }]);
      } else {
        setMessages((m) => m.map((x) => (x.failed ? { ...x, failed: false } : x)));
      }
      setSending(true);

      let id = activeIdRef.current;

      try {
        // First message in a brand-new chat → create it now.
        if (!id) {
          const created = await chatApi.create();
          id = created.chat_id;
          justCreatedRef.current = id;
          activeIdRef.current = id;
          replaceRoute(`chat/${id}`);
        }

        const res = await chatApi.send(id, text);

        // The user may have switched chats while we waited — don't leak the reply.
        if (activeIdRef.current === id) {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: res.ai_response, created_at: new Date().toISOString() },
          ]);
        }
        refreshChats();
      } catch (e) {
        if (activeIdRef.current === id || !id) {
          setMessages((m) => {
            const copy = [...m];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].role === "user") {
                copy[i] = { ...copy[i], failed: true };
                break;
              }
            }
            return copy;
          });
          setError({ text: e.message, retry: text });
        }
      } finally {
        setSending(false);
        textareaRef.current?.focus();
      }
    },
    [sending, refreshChats]
  );

  /* ---------------- load chat when route changes ---------------- */
  useEffect(() => {
    setError(null);
    setDraft("");
    setDrawerOpen(false);
    stickRef.current = true;

    if (chatId) fromPendingRef.current = false;

    // Just created by send() — messages are already on screen.
    if (chatId && justCreatedRef.current === chatId) {
      justCreatedRef.current = null;
      return;
    }

    if (!chatId) {
      // A prompt handed over from the Home screen. It is consumed exactly once;
      // React StrictMode (dev) re-runs this effect, and that replay must not
      // clear the optimistic message that send() has just put on screen.
      const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_PROMPT_KEY);
        fromPendingRef.current = true;
        setMessages([]);
        setTitle("");
        send(pending);
        return;
      }
      if (fromPendingRef.current) return; // StrictMode replay

      setMessages([]);
      setTitle("");
      textareaRef.current?.focus();
      return;
    }

    let cancelled = false;
    setLoadingChat(true);
    setMessages([]);
    chatApi
      .get(chatId)
      .then((chat) => {
        if (cancelled) return;
        setMessages(chat.messages || []);
        setTitle(chat.title || "");
        requestAnimationFrame(() => scrollToBottom(false));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e.status === 404 || e.status === 400 ? "That chat no longer exists." : e.message);
        navigate("chat");
      })
      .finally(() => !cancelled && setLoadingChat(false));

    return () => {
      cancelled = true;
    };
    // `send` intentionally omitted: we only want this to run on route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  /* ---------------- composer ---------------- */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [draft]);

  const submit = () => {
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    send(text);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  /* ---------------- delete ---------------- */
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await chatApi.remove(toDelete.chat_id);
      removeChatLocal(toDelete.chat_id);
      toast.success("Chat deleted");
      if (toDelete.chat_id === chatId) navigate("chat");
      setToDelete(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const liveTitle = chats.find((c) => c.chat_id === chatId)?.title || title;
  const isEmpty = !loadingChat && messages.length === 0 && !sending;
  const canSend = draft.trim().length > 0 && !sending;

  return (
    <div className="chat-layout">
      {/* Thread list: fixed column on desktop, slide-over on mobile */}
      <aside className={`chat-threads ${drawerOpen ? "open" : ""}`}>
        <ThreadList
          chats={chats}
          loading={chatsLoading}
          error={chatsError}
          activeId={chatId}
          onNew={() => navigate("chat")}
          onOpen={(id) => navigate(`chat/${id}`)}
          onDelete={setToDelete}
          onRetry={refreshChats}
        />
      </aside>
      {drawerOpen && <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />}

      <section className="conversation">
        <div className="conversation-bar">
          <button className="icon-btn thread-toggle" onClick={() => setDrawerOpen(true)} aria-label="Open chats">
            <IconMenu />
          </button>
          <span className="conversation-title">{liveTitle || "New chat"}</span>
        </div>

        <div className="messages" ref={scrollRef} onScroll={onScroll}>
          <div className="messages-inner">
            {loadingChat && (
              <div className="msg-skeletons">
                <div className="skeleton" style={{ height: 44, width: "46%", marginLeft: "auto" }} />
                <div className="skeleton" style={{ height: 92, width: "82%" }} />
                <div className="skeleton" style={{ height: 44, width: "38%", marginLeft: "auto" }} />
                <div className="skeleton" style={{ height: 120, width: "88%" }} />
              </div>
            )}

            {isEmpty && (
              <div className="chat-empty">
                <h1>How can I help?</h1>
                <p>Pick a starting point or just type below.</p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.title} onClick={() => send(s.text)}>
                      <strong>{s.title}</strong>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Message key={i} message={m} />
            ))}

            {sending && (
              <div className="msg assistant">
                <span className="avatar">A</span>
                <div className="typing" aria-label="Assistant is typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
          </div>
        </div>

        {showJump && (
          <button
            className="jump"
            onClick={() => {
              stickRef.current = true;
              scrollToBottom(true);
            }}
            aria-label="Jump to latest message"
          >
            <IconDown />
          </button>
        )}

        <div className="composer-wrap">
          {error && (
            <div className="chat-error" role="alert">
              <IconAlert />
              <span>{error.text}</span>
              <button onClick={() => send(error.retry, { isRetry: true })}>
                <IconRefresh /> Retry
              </button>
            </div>
          )}

          <div className="composer">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message the assistant…"
              rows={1}
              maxLength={8000}
              aria-label="Message"
            />
            <button className="send" onClick={submit} disabled={!canSend} aria-label="Send message">
              <IconSend />
            </button>
          </div>
          <p className="composer-hint">Enter to send · Shift + Enter for a new line · Answers can contain mistakes.</p>
        </div>
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete this chat?"
          message={`“${toDelete.title || "New Chat"}” and all its messages will be permanently removed.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

function Message({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  if (isUser) {
    return (
      <div className={`msg user ${message.failed ? "failed" : ""}`}>
        <div className="bubble">{message.content}</div>
        {message.failed && <span className="msg-failed">Not sent</span>}
      </div>
    );
  }

  return (
    <div className="msg assistant">
      <span className="avatar">A</span>
      <div className="msg-body">
        <Markdown>{message.content}</Markdown>
        <div className="msg-actions">
          <span>{formatTime(message.created_at)}</span>
          <button onClick={copy}>
            {copied ? <IconCheck /> : <IconCopy />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
