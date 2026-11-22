import { useEffect, useState } from "react";

// Tiny hash router:  #/   #/chat   #/chat/<id>   #/resume   #/resume/<id>
// Hash routing means refresh + back/forward + shareable links all work
// with no server config.
function parse() {
  const [, page = "home", id = null] = window.location.hash.replace(/^#/, "").split("/");
  const known = ["home", "chat", "resume"];
  return { page: known.includes(page) ? page : "home", id: id ? decodeURIComponent(id) : null };
}

export function navigate(path) {
  const next = "#/" + path.replace(/^\/+/, "");
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = next;
  }
}

// Change the URL without triggering a re-parse side effect in listeners that
// don't care (used after lazily creating a chat on first message).
export function replaceRoute(path) {
  const next = "#/" + path.replace(/^\/+/, "");
  window.history.replaceState(null, "", next);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute() {
  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return { ...route, navigate };
}
