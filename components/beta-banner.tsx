import React from "react";

export default function BetaBanner() {
  return (
    <div
      className="w-full sticky top-0 z-50 bg-emerald-600 text-white dark:bg-emerald-900 border-b border-emerald-700/40"
      role="region"
      aria-label="Application status banner"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <p className="text-sm font-medium">
            This app is in beta. Expect bugs.
          </p>
          <p className="text-sm">
            <a
              href="https://github.com/geckoHex/draw/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-emerald-200"
            >
              Give feedback
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
