import { create } from 'zustand';
import type {
  AnomalySegment,
  CurvePoint,
  TargetCurve,
  TemperatureReading,
} from '../types';

interface KilnState {
  targetCurve: TargetCurve | null;
  readings: TemperatureReading[];
  anomalies: AnomalySegment[];
  isSampling: boolean;
  samplingStartTime: number | null;
  error: string | null;

  setTargetCurve: (curve: TargetCurve | null) => void;
  setReadings: (readings: TemperatureReading[]) => void;
  addReading: (reading: TemperatureReading) => void;
  setAnomalies: (anomalies: AnomalySegment[]) => void;
  setSampling: (active: boolean) => void;
  setSamplingStartTime: (t: number | null) => void;
  setError: (err: string | null) => void;
  resetAll: () => void;
}

export const useKilnStore = create<KilnState>((set) => ({
  targetCurve: null,
  readings: [],
  anomalies: [],
  isSampling: false,
  samplingStartTime: null,
  error: null,

  setTargetCurve: (curve) => set({ targetCurve: curve }),
  setReadings: (readings) => set({ readings }),
  addReading: (reading) =>
    set((s) => ({ readings: [...s.readings, reading] })),
  setAnomalies: (anomalies) => set({ anomalies }),
  setSampling: (active) => set({ isSampling: active }),
  setSamplingStartTime: (t) => set({ samplingStartTime: t }),
  setError: (err) => set({ error: err }),
  resetAll: () =>
    set({
      readings: [],
      anomalies: [],
      isSampling: false,
      samplingStartTime: null,
      error: null,
    }),
}));

export async function postCurve(points: CurvePoint[]): Promise<TargetCurve> {
  const res = await fetch('/api/curves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '创建曲线失败');
  return json.data as TargetCurve;
}

export async function fetchLatestCurve(): Promise<TargetCurve | null> {
  const res = await fetch('/api/curves/latest');
  const json = await res.json();
  return json.success ? (json.data as TargetCurve | null) : null;
}

export async function postReading(
  curveId: number,
  minute: number,
  temperature: number
): Promise<TemperatureReading> {
  const res = await fetch('/api/readings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ curveId, minute, temperature }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '上报失败');
  return json.data as TemperatureReading;
}

export async function fetchReadings(
  curveId: number
): Promise<TemperatureReading[]> {
  const res = await fetch(`/api/readings?curveId=${curveId}`);
  const json = await res.json();
  return json.success ? (json.data as TemperatureReading[]) : [];
}

export async function fetchAnomalies(
  curveId: number
): Promise<AnomalySegment[]> {
  const res = await fetch(`/api/readings/anomalies?curveId=${curveId}`);
  const json = await res.json();
  return json.success ? (json.data as AnomalySegment[]) : [];
}

export function getExportUrl(
  curveId: number,
  fromMinute?: number,
  toMinute?: number
): string {
  const params = new URLSearchParams({ curveId: String(curveId) });
  if (fromMinute !== undefined) params.set('fromMinute', String(fromMinute));
  if (toMinute !== undefined) params.set('toMinute', String(toMinute));
  return `/api/export/csv?${params.toString()}`;
}
