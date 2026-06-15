import type { CurvePoint } from '../types';

export function interpolateTargetTemperature(
  points: CurvePoint[],
  minute: number
): number {
  if (!points || points.length === 0) return 0;
  if (points.length === 1) return points[0].temperature;
  if (minute <= points[0].minute) return points[0].temperature;
  if (minute >= points[points.length - 1].minute)
    return points[points.length - 1].temperature;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    if (minute >= prev.minute && minute <= next.minute) {
      const ratio = (minute - prev.minute) / (next.minute - prev.minute);
      return prev.temperature + (next.temperature - prev.temperature) * ratio;
    }
  }
  return points[points.length - 1].temperature;
}
