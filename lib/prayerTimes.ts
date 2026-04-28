import axios from "axios";
import { PrayerTimes, ApiPrayerResponse } from "@/types/prayer.types";

// Coordonnées de Tunis
const TUNIS_COORDINATES = {
  latitude: 36.8065,
  longitude: 10.1815,
};

// Méthode de calcul par défaut pour la Tunisie (MWL)
const DEFAULT_METHOD = 3;

// Cache pour éviter trop d'appels API
let cache: { [key: string]: PrayerTimes } = {};

export async function getPrayerTimes(
  date: Date = new Date(),
  method: number = DEFAULT_METHOD
): Promise<PrayerTimes | null> {
  const cacheKey = `${date.toDateString()}-${method}`;

  // Vérifier le cache
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  const formattedDate = date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .split("/")
    .join("-");

  try {
    const response = await axios.get<ApiPrayerResponse>(
      `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${TUNIS_COORDINATES.latitude}&longitude=${TUNIS_COORDINATES.longitude}&method=${method}`
    );

    const prayerTimes: PrayerTimes = {
      asr: response.data.data.timings.Asr,
      fajr: response.data.data.timings.Fajr,
      dhuhr: response.data.data.timings.Dhuhr,
      maghrib: response.data.data.timings.Maghrib,
      isha: response.data.data.timings.Isha,
      date: response.data.data.date.readable,
    };

    // Mettre en cache
    cache[cacheKey] = prayerTimes;

    return prayerTimes;
  } catch (error) {
    console.error("Erreur lors du calcul des heures de prière:", error);
    return getFallbackPrayerTimes(date);
  }
}

function getFallbackPrayerTimes(date: Date): PrayerTimes {
  return {
    asr: "15:30",
    fajr: "05:00",
    dhuhr: "12:30",
    maghrib: "17:45",
    isha: "19:15",
    date: date.toLocaleDateString("fr-FR"),
  };
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getNextPrayer(
  currentTime: string,
  prayers: PrayerTimes
): string | null {
  const prayerOrder: (keyof PrayerTimes)[] = [
    "fajr",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
  ];
  const currentMinutes = timeToMinutes(currentTime);

  for (const prayer of prayerOrder) {
    const prayerMinutes = timeToMinutes(prayers[prayer]);
    if (prayerMinutes > currentMinutes) {
      return prayer;
    }
  }
  return "fajr";
}

// Vider le cache (utile si la date change)
export function clearCache(): void {
  cache = {};
}
