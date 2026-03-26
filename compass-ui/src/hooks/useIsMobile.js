import { useState, useEffect } from "react";
import { BP } from "../tokens";

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < BP);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BP - 1}px)`);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    setMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}
