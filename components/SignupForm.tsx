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
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(value.trim())) {
      setError(true);
      return;
    }
    setError(false);
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("coin-flash"));
    }
  }

  return (
    <div
      className={`pointer-events-${visible ? "auto" : "none"} fixed inset-x-0 bottom-[18vh] z-20 flex justify-center transition-opacity`}
      style={{
        opacity: visible ? 1 : 0,
        transition: reducedMotion ? "opacity 0.3s ease-out" : "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: reducedMotion
          ? undefined
          : "perspective(800px) rotateX(8deg)",
        transformOrigin: "center bottom",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-[min(80vw,320px)] flex flex-col items-center"
        noValidate
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={submitted ? "" : value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(false);
          }}
          placeholder={submitted ? FORM.success : FORM.placeholder}
          disabled={submitted}
          aria-label="Work email"
          className="w-full bg-transparent border-0 border-b border-ink py-2 text-body text-ink placeholder:text-ink/70 focus:outline-none focus:placeholder:text-ink/40 disabled:placeholder:text-ink"
          style={{
            borderBottomWidth: 1,
          }}
        />
        <span
          className="mt-6 text-body-sm text-ink/50"
          style={{ opacity: submitted ? 0 : 1, transition: "opacity 0.4s ease-out" }}
        >
          {FORM.note}
        </span>
        {error && (
          <span
            className="mt-2 text-body-sm text-ink/80"
            role="alert"
            aria-live="polite"
          >
            Please use a valid work email.
          </span>
        )}
      </form>
    </div>
  );
}
