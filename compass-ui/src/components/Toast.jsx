import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { FONT } from "../tokens";

export const ToastContext = React.createContext(() => {});
export const useToast = () => React.useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {createPortal(
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, display: "flex", flexDirection: "column-reverse", gap: "8px", pointerEvents: "none" }}>
          {toasts.map((t) => (
            <div key={t.id} style={{
              background: t.type === "success" ? "#065F46" : t.type === "error" ? "#DC2626" : "#111827",
              color: "#fff", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500,
              fontFamily: FONT, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px",
              animation: "toastIn 0.25s ease-out",
            }}>
              {t.type === "success" && <Check size={14} />}
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
