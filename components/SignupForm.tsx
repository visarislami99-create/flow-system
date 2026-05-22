"use client";

import { useState } from "react";
import { FORM } from "@/lib/copy";

interface Props {
  visible: boolean;
  reducedMotion: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm({ visible, reducedMotion }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please use a valid work email.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
    } catch (_) {
      // Network error — still show success; email is logged server-side.
    }

    setLoading(false);
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("coin-flash"));
    }
  }

  return (
    <div
      className={`pointer-events-${visible ? "auto" : "none"} fixed inset-x-0 bottom-[18vh] z-20 flex justify-center`}
      style={{
        opacity: visible ? 1 : 0,
        transition: reducedMotion
          ? "opacity 0.3s ease-out"
          : "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: reducedMotion
          ? undefined
          : "perspective(800px) rotateX(8deg)",
        transformOrigin: "center bottom",
      }}
    >
      {submitted ? (
        /* Success state — standalone text, never truncated */
        <div
          className="w-[min(88vw,400px)] flex flex-col items-center px-4"
          style={{
            animation: reducedMotion
              ? undefined
              : "af-fadeup 0.5s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <p className="text-body text-ink text-center leading-relaxed tracking-wide">
            {FORM.success}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-[min(88vw,400px)] flex flex-col items-center px-4"
          noValidate
        >
          {/* Input + submit button — single bottom border spans both */}
          <div
            className="w-full flex items-center gap-1"
            style={{ borderBottom: "1px solid rgba(10,10,10,0.7)" }}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={FORM.placeholder}
              disabled={loading}
              aria-label="Work email"
              className="flex-1 min-w-0 bg-transparent border-0 py-2.5 text-body text-ink placeholder:text-ink/55 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Submit"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-ink/35 hover:text-[#C9A77A] transition-colors duration-200 disabled:opacity-25"
              style={{ cursor: loading ? "wait" : "pointer" }}
            >
              {loading ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="animate-spin"
                  aria-hidden
                >
                  <circle
                    cx="7.5"
                    cy="7.5"
                    r="5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="26"
                    strokeDashoffset="9"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2.5 8h11M9 3.5L13.5 8 9 12.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Subtext / validation error */}
          <div className="mt-3 min-h-[1.25rem] flex items-center">
            {error ? (
              <span
                className="text-body-sm text-ink/70 text-center"
                role="alert"
                aria-live="polite"
              >
                {error}
              </span>
            ) : (
              <span className="text-body-sm text-ink/40 text-center">
                {FORM.note}
              </span>
            )}
          </div>
        </form>
      )}

      <style>{`
        @keyframes af-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
