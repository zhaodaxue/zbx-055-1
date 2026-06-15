import { vi } from 'vitest';
import type { TargetCurve, TemperatureReading, AnomalySegment } from '../../types';

let _readings: TemperatureReading[] = [];
let _curve: TargetCurve | null = null;
let _anomalies: AnomalySegment[] = [];
let _readingIdCounter = 0;
let _callLog: string[] = [];

export function resetFetchMock() {
  _readings = [];
  _curve = null;
  _anomalies = [];
  _readingIdCounter = 0;
  _callLog = [];
}

export function getCallLog(): string[] {
  return [..._callLog];
}

export function setMockCurve(curve: TargetCurve) {
  _curve = curve;
}

export function getMockCurve(): TargetCurve | null {
  return _curve;
}

export function setMockReadings(readings: TemperatureReading[]) {
  _readings = [...readings];
  _readingIdCounter = readings.length;
}

export function getMockReadings(): TemperatureReading[] {
  return [..._readings];
}

export function setMockAnomalies(anomalies: AnomalySegment[]) {
  _anomalies = [...anomalies];
}

export function getMockAnomalies(): AnomalySegment[] {
  return [..._anomalies];
}

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    statusText: status === 200 ? 'OK' : 'Error',
    type: 'basic',
    url: '',
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as unknown as Response;
}

export function installFetchMock() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';

    _callLog.push(`${method} ${url}`);

    if (url.startsWith('/api/curves') && method === 'POST') {
      const body = JSON.parse(init?.body as string || '{}');
      const id = _curve ? _curve.id + 1 : 1;
      const newCurve: TargetCurve = {
        id,
        points: body.points,
        createdAt: new Date().toISOString(),
      };
      _curve = newCurve;
      _readings = [];
      _anomalies = [];
      _readingIdCounter = 0;
      return jsonResponse({ success: true, data: newCurve });
    }

    if (url.startsWith('/api/curves/latest') && method === 'GET') {
      return jsonResponse({ success: true, data: _curve });
    }

    if (url.match(/\/api\/curves\/\d+/) && method === 'GET') {
      const id = parseInt(url.split('/').pop() || '0', 10);
      if (_curve && _curve.id === id) {
        return jsonResponse({ success: true, data: _curve });
      }
      return jsonResponse({ success: false, error: '曲线不存在' }, 404);
    }

    if (url.startsWith('/api/readings') && method === 'POST' && !url.includes('anomalies')) {
      const body = JSON.parse(init?.body as string || '{}');
      const { curveId, minute, temperature } = body;
      _readingIdCounter += 1;
      const reading: TemperatureReading = {
        id: _readingIdCounter,
        curveId,
        minute,
        temperature,
        timestamp: new Date().toISOString(),
      };
      const existingIdx = _readings.findIndex((r) => r.minute === minute);
      if (existingIdx >= 0) {
        _readings[existingIdx] = { ...reading, id: _readings[existingIdx].id };
      } else {
        _readings.push(reading);
      }
      _readings.sort((a, b) => a.minute - b.minute);
      return jsonResponse({ success: true, data: reading });
    }

    if (url.startsWith('/api/readings') && url.includes('anomalies') && method === 'GET') {
      return jsonResponse({ success: true, data: _anomalies });
    }

    if (url.startsWith('/api/readings') && method === 'GET' && !url.includes('anomalies')) {
      return jsonResponse({ success: true, data: _readings });
    }

    return jsonResponse({ success: false, error: 'Not Found' }, 404);
  }));
}
