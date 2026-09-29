// Open-Meteo (free, no key) for the Rainy/Cold chip (FR-203).
import { CITIES } from '@/domain/links';

export interface WeatherNow {
  rainy: boolean;
  cold: boolean;
  tempC: number;
}

export async function fetchWeather(city: string): Promise<WeatherNow | null> {
  const c = CITIES.find((x) => x.name.toLowerCase() === city.toLowerCase()) ?? CITIES[0];
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,precipitation,weather_code`,
    );
    if (!res.ok) return null;
    const j = await res.json();
    const code: number = j?.current?.weather_code ?? 0;
    const temp: number = j?.current?.temperature_2m ?? 25;
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 99) || (j?.current?.precipitation ?? 0) > 0.2;
    return { rainy, cold: temp < 16, tempC: temp };
  } catch {
    return null;
  }
}
