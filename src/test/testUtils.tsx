import { render, type RenderResult } from '@testing-library/react';
import { useKilnStore } from '../store/kilnStore';
import { installFetchMock, resetFetchMock, setMockAnomalies, setMockCurve, setMockReadings } from './mocks/fetchMock';
import type { AnomalySegment, CurvePoint, TargetCurve, TemperatureReading } from '../types';
import { ReactNode } from 'react';

export function setupTestEnvironment() {
  beforeEach(() => {
    resetFetchMock();
    installFetchMock();
    useKilnStore.setState({
      targetCurve: null,
      readings: [],
      anomalies: [],
      isSampling: false,
      samplingStartTime: null,
      error: null,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
}

export function createTestCurve(
  id: number,
  points: CurvePoint[] = [
    { minute: 0, temperature: 25 },
    { minute: 60, temperature: 800 },
  ]
): TargetCurve {
  return {
    id,
    points,
    createdAt: '2026-06-15T10:00:00Z',
  };
}

export function createTestReadings(
  curveId: number,
  count: number,
  startMinute = 0,
  step = 0.5,
  baseTemp = 25,
  tempPerMinute = 12.92
): TemperatureReading[] {
  const readings: TemperatureReading[] = [];
  for (let i = 0; i < count; i++) {
    const minute = startMinute + i * step;
    const temperature = baseTemp + minute * tempPerMinute;
    readings.push({
      id: i + 1,
      curveId,
      minute,
      temperature: Math.round(temperature * 100) / 100,
      timestamp: new Date(Date.now() + minute * 60 * 1000).toISOString(),
    });
  }
  return readings;
}

export function createTestAnomaly(
  startMinute: number,
  endMinute: number,
  maxDeviation: number
): AnomalySegment {
  return {
    id: `seg-${startMinute}-${endMinute}`,
    startMinute,
    endMinute,
    startIndex: Math.round(startMinute * 2),
    endIndex: Math.round(endMinute * 2),
    maxDeviation,
    pointCount: Math.round((endMinute - startMinute) / 0.5) + 1,
  };
}

export function setupMockWithHistory(
  curve: TargetCurve,
  readings: TemperatureReading[],
  anomalies: AnomalySegment[] = []
) {
  setMockCurve(curve);
  setMockReadings(readings);
  setMockAnomalies(anomalies);
  useKilnStore.setState({
    targetCurve: curve,
    readings,
    anomalies,
    isSampling: false,
    samplingStartTime: null,
    error: null,
  });
}

export {
  useKilnStore,
  setMockCurve,
  setMockReadings,
  setMockAnomalies,
};
