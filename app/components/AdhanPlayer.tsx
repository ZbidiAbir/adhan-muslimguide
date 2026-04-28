"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPrayerTimes,
  getNextPrayer,
  timeToMinutes,
} from "@/lib/prayerTimes";
import audioService from "@/lib/audioService";
import AudioUnlock from "./AudioUnlock";
import MethodSelector from "./MethodSelector";
import { PrayerTimes } from "@/types/prayer.types";

type StatusType =
  | "Loading..."
  | "Ready"
  | "🔊 Adhan playing..."
  | "Audio error"
  | "Audio blocked";

export default function AdhanPlayer() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [volume, setVolume] = useState<number>(0.8);
  const [status, setStatus] = useState<StatusType>("Loading...");
  const [adhanTriggered, setAdhanTriggered] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [calculationMethod, setCalculationMethod] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedDateRef = useRef<string>("");
  const lastPlayedPrayerRef = useRef<string>("");

  // Audio initialization
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioService.loadAdhan("/adhan.mp3");
        audioService.setVolume(volume);

        if (audioService.isUnlocked) {
          setIsAudioUnlocked(true);
          setStatus("Ready");
        } else {
          setStatus("Audio blocked");
        }
      } catch (error) {
        console.error("Error loading audio:", error);
        setStatus("Audio error");
      }
    };

    initAudio();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update time every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch prayer times
  const fetchPrayerTimes = useCallback(async () => {
    setIsLoading(true);
    const times = await getPrayerTimes(currentTime, calculationMethod);
    if (times) {
      setPrayerTimes(times);
    }
    setIsLoading(false);
  }, [currentTime, calculationMethod]);

  useEffect(() => {
    fetchPrayerTimes();
  }, [fetchPrayerTimes]);

  // Update next prayer
  useEffect(() => {
    if (prayerTimes) {
      const currentHourMinute = currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const next = getNextPrayer(currentHourMinute, prayerTimes);
      setNextPrayer(next);
    }
  }, [currentTime, prayerTimes]);

  // Check and trigger Adhan for any prayer time
  const checkAndPlayAdhan = useCallback(() => {
    if (!prayerTimes || !isAudioUnlocked) return;

    const now = new Date();
    const currentHourMinute = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const today = now.toLocaleDateString();

    // List of all prayer times to check
    const prayers = [
      { name: "Fajr", time: prayerTimes.fajr },
      { name: "Dhuhr", time: prayerTimes.dhuhr },
      { name: "Asr", time: prayerTimes.asr },
      { name: "Maghrib", time: prayerTimes.maghrib },
      { name: "Isha", time: prayerTimes.isha },
    ];

    // Find which prayer time matches current time
    const matchingPrayer = prayers.find(
      (prayer) => prayer.time === currentHourMinute
    );

    if (
      matchingPrayer &&
      !adhanTriggered &&
      (lastPlayedDateRef.current !== today ||
        lastPlayedPrayerRef.current !== matchingPrayer.name)
    ) {
      console.log(
        `🕌 It's ${matchingPrayer.name} time (${matchingPrayer.time})! Triggering Adhan...`
      );

      if (!audioService.isPlaying) {
        audioService.play();
        setAdhanTriggered(true);
        lastPlayedDateRef.current = today;
        lastPlayedPrayerRef.current = matchingPrayer.name;
        setStatus(`🔊 Adhan playing...`);

        if (Notification.permission === "granted") {
          new Notification("🕌 Prayer time", {
            body: `It's time for ${matchingPrayer.name} prayer at ${matchingPrayer.time}`,
            silent: false,
          });
        }

        setTimeout(() => {
          if (audioService.isPlaying) {
            audioService.stop();
          }
          setAdhanTriggered(false);
          if (!audioService.isPlaying) {
            setStatus("Ready");
          }
        }, 300000);
      }
    } else if (!matchingPrayer && adhanTriggered) {
      setAdhanTriggered(false);
    }
  }, [prayerTimes, adhanTriggered, isAudioUnlocked]);

  useEffect(() => {
    checkAndPlayAdhan();
  }, [currentTime, prayerTimes, checkAndPlayAdhan]);

  const handleMethodChange = (methodId: number) => {
    setCalculationMethod(methodId);
  };

  const handleAudioUnlocked = () => {
    setIsAudioUnlocked(true);
    setStatus("Ready");
  };

  const testAdhan = (): void => {
    if (!isAudioUnlocked) {
      alert("Please first enable sound by clicking the activation button");
      return;
    }
    audioService.play();
    setStatus("🔊 Test Adhan playing..." as StatusType);
    setTimeout(() => {
      if (!audioService.isPlaying) {
        setStatus("Ready");
      }
    }, 30000);
  };

  const stopAdhan = (): void => {
    audioService.stop();
    setStatus("Ready");
    setAdhanTriggered(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioService.setVolume(newVolume);
  };

  const requestNotificationPermission = async (): Promise<void> => {
    if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
  };

  const getTimeRemaining = (): string => {
    if (!prayerTimes || !nextPrayer) return "";

    const now = new Date();
    const currentHourMinute = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const currentMinutes = timeToMinutes(currentHourMinute);
    const nextPrayerTime = prayerTimes[
      nextPrayer.toLowerCase() as keyof PrayerTimes
    ] as string;
    const nextMinutes = timeToMinutes(nextPrayerTime);

    let diffMinutes = nextMinutes - currentMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  if (!prayerTimes || isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative text-white text-xl font-light">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">
                {isLoading ? "Loading prayer times..." : "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AudioUnlock onUnlocked={handleAudioUnlocked} />

      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 overflow-y-auto">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Decorative pattern */}
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "30px 30px",
            }}
          ></div>
        </div>

        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="inline-block mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="relative text-7xl md:text-8xl animate-float">
                    🕌
                  </div>
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 bg-clip-text text-transparent mb-4">
                Adhan Muslim Guide
              </h1>
              <p className="text-emerald-200/80 text-base md:text-lg tracking-wide">
                Prayer Times & Adhan Player
              </p>
            </div>

            {/* Notification Bar */}
            {!isAudioUnlocked && (
              <div className="mb-8 max-w-2xl mx-auto animate-fade-in">
                <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-2xl p-5 text-center shadow-xl">
                  <div className="flex items-center justify-center gap-3 text-amber-300">
                    <span className="text-2xl">⚠️</span>
                    <span className="font-medium text-base">
                      Click "Enable sound" to activate audio playback
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left Column - Main Prayer Time */}
              <div className="space-y-6">
                {/* Next Prayer Card */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
                  <div className="relative bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <h2 className="text-xl font-semibold text-amber-200">
                          Next Prayer
                        </h2>
                      </div>
                      <div className="text-3xl  font-mono font-bold bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent mb-6 tracking-wider uppercase">
                        {nextPrayer || "Loading..."}
                      </div>
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-emerald-200">
                        <span>🕌</span>
                        <span>Upcoming prayer time</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="transform transition-all duration-300 hover:scale-105">
                  <div className="bg-gradient-to-r from-emerald-800/50 to-teal-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
                    <div className="text-sm text-emerald-300 mb-3 flex items-center justify-center gap-2">
                      <span>⏱️</span>
                      <span>Time remaining until next prayer</span>
                    </div>
                    <div className="text-4xl md:text-5xl font-mono font-bold text-amber-300">
                      {getTimeRemaining()}
                    </div>
                  </div>
                </div>

                {/* Method Selector - Uncomment if needed */}
                {/* <div className="transform transition-all duration-300 hover:scale-[1.02]">
                  <MethodSelector
                    currentMethod={calculationMethod}
                    onMethodChange={handleMethodChange}
                  />
                </div> */}
              </div>

              {/* Right Column - All Prayer Times */}
              <div className="space-y-6">
                {/* Prayer Times Grid */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-center mb-8 text-emerald-200 flex items-center justify-center gap-2">
                    <span>📿</span>
                    <span>Prayer Times for {prayerTimes.date}</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[
                      {
                        name: "Fajr",
                        time: prayerTimes.fajr,
                        icon: "🌅",
                        desc: "Dawn",
                      },
                      {
                        name: "Dhuhr",
                        time: prayerTimes.dhuhr,
                        icon: "☀️",
                        desc: "Noon",
                      },
                      {
                        name: "Asr",
                        time: prayerTimes.asr,
                        icon: "🌟",
                        desc: "Afternoon",
                      },
                      {
                        name: "Maghrib",
                        time: prayerTimes.maghrib,
                        icon: "🌆",
                        desc: "Sunset",
                      },
                      {
                        name: "Isha",
                        time: prayerTimes.isha,
                        icon: "🌙",
                        desc: "Night",
                      },
                    ].map((prayer) => (
                      <div
                        key={prayer.name}
                        className="p-4 rounded-xl text-center transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10"
                      >
                        <div className="text-3xl mb-2">{prayer.icon}</div>
                        <div className="text-xs text-emerald-300 uppercase tracking-wide mb-1">
                          {prayer.desc}
                        </div>
                        <div className="text-sm font-semibold text-emerald-200 mb-1">
                          {prayer.name}
                        </div>
                        <div className="font-mono font-bold text-lg text-white">
                          {prayer.time}
                        </div>
                      </div>
                    ))}
                  </div>
                  {nextPrayer && (
                    <div className="mt-6 text-center bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl p-4 border border-white/10">
                      <span className="text-sm text-emerald-300">
                        ⏭️ Next prayer:{" "}
                      </span>
                      <span className="font-bold text-amber-300 uppercase tracking-wide text-lg">
                        {nextPrayer}
                      </span>
                    </div>
                  )}
                </div>

                {/* Audio Controls */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-6 text-emerald-200 flex items-center gap-2">
                    <span>🔊</span>
                    <span>Audio Controls</span>
                  </h3>

                  {/* Volume Control */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-emerald-300">
                        Volume
                      </label>
                      <span className="text-sm font-mono text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      disabled={!isAudioUnlocked}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-amber-400 [&::-webkit-slider-thumb]:to-yellow-400 [&::-webkit-slider-thumb]:shadow-lg disabled:opacity-50"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={testAdhan}
                      disabled={!isAudioUnlocked}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Test Adhan</span>
                    </button>
                    <button
                      onClick={stopAdhan}
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 py-3.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Stop</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              {/* Status Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-emerald-300 mb-2">
                      System Status
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          status === "Ready"
                            ? "bg-green-400 animate-pulse"
                            : status.includes("playing")
                            ? "bg-red-400 animate-pulse"
                            : "bg-yellow-400"
                        }`}
                      ></div>
                      <span
                        className={`font-semibold ${
                          status === "Ready"
                            ? "text-green-300"
                            : "text-yellow-300"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-300">Current Time</div>
                    <div className="text-lg font-mono font-bold text-white">
                      {currentTime.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 rounded-lg p-2 text-center">
                  ⚡ Adhan will automatically trigger at all prayer times
                </div>
                {audioService.isPlaying && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm animate-pulse bg-green-500/20 rounded-lg p-2">
                    <span>🎵</span>
                    <span className="text-amber-300 font-medium">
                      Playing Adhan...
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={requestNotificationPermission}
                    className="flex-1 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🔔</span>
                    <span>Notifications</span>
                  </button>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs text-emerald-300">
                    📡 Powered by AlAdhan.com API
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4">
                <p className="text-xs text-emerald-300">
                  Prayer times calculated using Muslim World League method
                  <br />
                  <span className="text-amber-300">
                    🕌 May Allah accept our prayers
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </>
  );
}
