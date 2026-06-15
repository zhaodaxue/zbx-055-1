export interface CurvePoint {
  minute: number;
  temperature: number;
}

export interface TargetCurve {
  id: number;
  name?: string;
  points: CurvePoint[];
  createdAt: string;
}

export interface TemperatureReading {
  id: number;
  curveId: number;
  minute: number;
  temperature: number;
  timestamp: string;
}

export interface AnomalySegment {
  id: string;
  startMinute: number;
  endMinute: number;
  startIndex: number;
  endIndex: number;
  maxDeviation: number;
  pointCount: number;
}

export interface ExportRow {
  minute: number;
  targetTemp: number | null;
  actualTemp: number;
  isAnomaly: boolean;
  deviation: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
