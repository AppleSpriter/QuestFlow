"use client";

import { useEffect } from "react";
import { syncThemeWithSystemOncePerDay } from "./theme";

export function ThemeInitializer() {
  useEffect(() => {
    syncThemeWithSystemOncePerDay();
  }, []);

  return null;
}
