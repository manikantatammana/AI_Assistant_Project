import { useEffect, useState } from "react";
import { IconChat, IconDoc, IconHome, IconPlus } from "./Icons";

const links = [
  { page: "home", label: "Home", Icon: IconHome, to: "" },
  { page: "chat", label: "Chat", Icon: IconChat, to: "chat" },
  { page: "resume", label: "Resume Analyzer", short: "Resume", Icon: IconDoc, to: "resume" },
];

export default function Header({ page, online, navigate }) {
  const [scrolled, setScrolled] = useState(false);

  // Header gets a solid background once the page has scrolled (Netflix-style)
  useEffect(() => {
    const el = document.getElementById("page-scroll");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [page]);

  const statusLabel = online === null ? "Connecting" : online ? "Online" : "Offline";
  const statusClass = online === null ? "" : online ? "online" : "offline";

  return (
    <>
      <header className={`header ${scrolled ? "scrolled" : ""}`}>
        <a
          className="brand"
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate("");
          }}
          aria-label="AI Assistant — home"
        >
          <span className="brand-mark">A</span>
          <span className="brand-name">Assistant</span>
        </a>

        <nav className="nav" aria-label="Main">
          {links.map(({ page: p, label, to }) => (
            <button
              key={p}
              className={`nav-link ${page === p ? "active" : ""}`}
              aria-current={page === p ? "page" : undefined}
              onClick={() => navigate(to)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="header-right">
          <span className={`status-pill ${statusClass}`} title="Backend and database connection">
            <i />
            {statusLabel}
          </span>
          {page !== "chat" && (
            <button className="btn btn-ghost header-new" onClick={() => navigate("chat")}>
              <IconPlus />
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav className="tabbar" aria-label="Main">
        {links.map(({ page: p, label, short, Icon, to }) => (
          <button
            key={p}
            className={page === p ? "active" : ""}
            onClick={() => navigate(to)}
            aria-current={page === p ? "page" : undefined}
          >
            <Icon />
            <span>{short || label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
