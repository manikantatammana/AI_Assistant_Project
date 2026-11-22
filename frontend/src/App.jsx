import "./styles/base.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/chat.css";
import "./styles/resume.css";

import Header from "./components/Header";
import { ToastProvider } from "./components/Toast";
import { LibraryProvider } from "./hooks/useLibrary";
import { useHealth } from "./hooks/useHealth";
import { useRoute } from "./hooks/useRoute";

import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Resume from "./pages/Resume";

function Shell() {
  const { page, id, navigate } = useRoute();
  const online = useHealth();

  return (
    <div className="app">
      <Header page={page} online={online} navigate={navigate} />

      {/* Chat manages its own scrolling so the composer can stay pinned */}
      {page === "chat" ? (
        <main className="page-scroll chat-host" id="page-scroll">
          <Chat chatId={id} navigate={navigate} />
        </main>
      ) : (
        <main className="page-scroll" id="page-scroll">
          <div className="page-enter" key={page + (id || "")}>
            {page === "home" && <Home navigate={navigate} online={online} />}
            {page === "resume" && <Resume resumeId={id} navigate={navigate} />}
          </div>
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <LibraryProvider>
        <Shell />
      </LibraryProvider>
    </ToastProvider>
  );
}
