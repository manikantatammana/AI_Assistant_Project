import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { chatApi, resumeApi } from "../api";

// App-wide store for the two lists the UI shows in several places
// (home rails, chat thread list, resume library). Keeping it here means a
// chat created on the Chat page appears on Home instantly, no refetch dance.
const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const [chats, setChats] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [chatsError, setChatsError] = useState("");
  const [resumesError, setResumesError] = useState("");

  const refreshChats = useCallback(async () => {
    try {
      const data = await chatApi.history();
      setChats(Array.isArray(data) ? data : []);
      setChatsError("");
    } catch (e) {
      setChatsError(e.message);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  const refreshResumes = useCallback(async () => {
    try {
      const data = await resumeApi.history();
      setResumes(Array.isArray(data) ? data : []);
      setResumesError("");
    } catch (e) {
      setResumesError(e.message);
    } finally {
      setResumesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChats();
    refreshResumes();
  }, [refreshChats, refreshResumes]);

  const value = useMemo(
    () => ({
      chats,
      resumes,
      chatsLoading,
      resumesLoading,
      chatsError,
      resumesError,
      refreshChats,
      refreshResumes,
      // optimistic helpers
      removeChatLocal: (id) => setChats((l) => l.filter((c) => c.chat_id !== id)),
      removeResumeLocal: (id) => setResumes((l) => l.filter((r) => r.resume_id !== id)),
    }),
    [chats, resumes, chatsLoading, resumesLoading, chatsError, resumesError, refreshChats, refreshResumes]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
