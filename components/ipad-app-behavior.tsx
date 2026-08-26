"use client";

import { useEffect } from "react";

function isIPad() {
  return /iPad/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function IPadAppBehavior() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ipad = String(isIPad());

    return () => {
      delete root.dataset.ipad;
    };
  }, []);

  return null;
}
