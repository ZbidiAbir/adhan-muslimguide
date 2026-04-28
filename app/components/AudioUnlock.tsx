"use client";

import { useState } from "react";
import audioService from "@/lib/audioService";

interface AudioUnlockProps {
  onUnlocked?: () => void;
}

export default function AudioUnlock({ onUnlocked }: AudioUnlockProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await audioService.unlockAudio();
      setIsUnlocked(true);
      onUnlocked?.();

      // Small sound test to confirm
      if (audioService.sound) {
        const originalVolume = audioService.getVolume();
        audioService.setVolume(0.1);
        audioService.play();
        setTimeout(() => {
          audioService.stop();
          audioService.setVolume(originalVolume);
        }, 500);
      }
    } catch (error) {
      console.error("Audio unlock error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isUnlocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-green-500">
        <div className="text-6xl mb-6">🔊</div>
        <h2 className="text-2xl font-bold mb-4 text-white">Enable Audio</h2>
        <p className="text-green-200 mb-6">
          Click the button below to enable sound and allow automatic playback of
          the Adhan at prayer time.
        </p>
        <button
          onClick={handleUnlock}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
        >
          {isLoading ? "Activating..." : "🔓 Enable sound"}
        </button>
        <p className="text-xs text-green-300 mt-4">
          This permission is required due to browser security policies
        </p>
      </div>
    </div>
  );
}
