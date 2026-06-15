import type {
  AnomalySegment,
  CurvePoint,
  TemperatureReading,
} from '../../shared/types.js';
import { interpolateTargetTemperature } from './curveParser.js';

export const ANOMALY_THRESHOLD = 25;
export const ANOMALY_MIN_CONSECUTIVE = 3;

export function detectAnomalies(
  readings: TemperatureReading[],
  curvePoints: CurvePoint[]
): AnomalySegment[] {
  const segments: AnomalySegment[] = [];
  if (readings.length < ANOMALY_MIN_CONSECUTIVE) return segments;

  let consecutiveCount = 0;
  let segmentStartIndex = -1;
  let maxDeviation = 0;

  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    const target = interpolateTargetTemperature(curvePoints, reading.minute);
    const deviation = Math.abs(reading.temperature - target);

    if (deviation > ANOMALY_THRESHOLD) {
      consecutiveCount++;
      if (consecutiveCount === ANOMALY_MIN_CONSECUTIVE) {
        segmentStartIndex = i - ANOMALY_MIN_CONSECUTIVE + 1;
        maxDeviation = deviation;
        for (
          let j = segmentStartIndex;
          j < i;
          j++
        ) {
          const r = readings[j];
          const t = interpolateTargetTemperature(curvePoints, r.minute);
          const d = Math.abs(r.temperature - t);
          if (d > maxDeviation) maxDeviation = d;
        }
      } else if (consecutiveCount > ANOMALY_MIN_CONSECUTIVE) {
        if (deviation > maxDeviation) maxDeviation = deviation;
      }
    } else {
      if (consecutiveCount >= ANOMALY_MIN_CONSECUTIVE && segmentStartIndex >= 0) {
        const startReading = readings[segmentStartIndex];
        const endReading = readings[i - 1];
        segments.push({
          id: `seg-${segmentStartIndex}-${i - 1}`,
          startMinute: startReading.minute,
          endMinute: endReading.minute,
          startIndex: segmentStartIndex,
          endIndex: i - 1,
          maxDeviation: Math.round(maxDeviation * 100) / 100,
          pointCount: i - segmentStartIndex,
        });
      }
      consecutiveCount = 0;
      segmentStartIndex = -1;
      maxDeviation = 0;
    }
  }

  if (consecutiveCount >= ANOMALY_MIN_CONSECUTIVE && segmentStartIndex >= 0) {
    const startReading = readings[segmentStartIndex];
    const endReading = readings[readings.length - 1];
    segments.push({
      id: `seg-${segmentStartIndex}-${readings.length - 1}`,
      startMinute: startReading.minute,
      endMinute: endReading.minute,
      startIndex: segmentStartIndex,
      endIndex: readings.length - 1,
      maxDeviation: Math.round(maxDeviation * 100) / 100,
      pointCount: readings.length - segmentStartIndex,
    });
  }

  return segments;
}

export function isMinuteInAnomaly(
  minute: number,
  anomalies: AnomalySegment[]
): boolean {
  return anomalies.some(
    (a) => minute >= a.startMinute && minute <= a.endMinute
  );
}
