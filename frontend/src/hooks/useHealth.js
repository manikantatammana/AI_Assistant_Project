import { useEffect, useState } from "react";
import { healthApi } from "../api";

// null = checking, true = online, false = offline
export function useHealth(intervalMs = 30000) {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const ok = await healthApi.database();
        if (alive) setOnline(ok);
      } catch {
        if (alive) setOnline(false);
      }
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return online;
}
