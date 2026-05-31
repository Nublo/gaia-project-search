"use client";

import { useState } from "react";

interface SpoilerProps {
  label: string;
  children: React.ReactNode;
}

export function Spoiler({ label, children }: SpoilerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-4 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left text-sm font-medium text-gray-700 transition-colors"
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
