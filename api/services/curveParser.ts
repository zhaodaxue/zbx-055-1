import type { CurvePoint } from '../../shared/types.js';

export const MIN_TEMP = 0;
export const MAX_TEMP = 1400;

export class CurveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurveValidationError';
  }
}

export function validateCurvePoints(points: CurvePoint[]): void {
  if (!points || points.length === 0) {
    throw new CurveValidationError('至少需要一个时间点');
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (typeof p.minute !== 'number' || isNaN(p.minute) || p.minute < 0) {
      throw new CurveValidationError(`第 ${i + 1} 行：时间必须为非负数字`);
    }
    if (typeof p.temperature !== 'number' || isNaN(p.temperature)) {
      throw new CurveValidationError(`第 ${i + 1} 行：温度必须为数字`);
    }
    if (p.temperature < MIN_TEMP || p.temperature > MAX_TEMP) {
      throw new CurveValidationError(
        `第 ${i + 1} 行：温度必须在 ${MIN_TEMP}℃ ~ ${MAX_TEMP}℃ 之间`
      );
    }
    if (i > 0 && p.minute <= points[i - 1].minute) {
      throw new CurveValidationError(`第 ${i + 1} 行：时间必须严格递增`);
    }
  }
}

export function interpolateTargetTemperature(
  points: CurvePoint[],
  minute: number
): number {
  if (points.length === 0) return 0;
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
