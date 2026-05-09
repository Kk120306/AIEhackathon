"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "friday_tutor_voice_id";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export function useVoicePreference() {
  const [voiceId, setVoiceIdState] = useState<string>(DEFAULT_VOICE_ID);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setVoiceIdState(stored);
  }, []);

  const setVoiceId = useCallback((id: string) => {
    setVoiceIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { voiceId, setVoiceId };
}
