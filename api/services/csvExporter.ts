import type {
  AnomalySegment,
  CurvePoint,
  ExportRow,
  TemperatureReading,
} from '../../shared/types.js';
import { interpolateTargetTemperature } from './curveParser.js';
import { isMinuteInAnomaly } from './anomalyDetector.js';

const BOM = '\uFEFF';

export function buildExportRows(
  readings: TemperatureReading[],
  curvePoints: CurvePoint[],
  anomalies: AnomalySegment[]
): ExportRow[] {
  return readings.map((r) => {
    const target = interpolateTargetTemperature(curvePoints, r.minute);
    const deviation = Math.abs(r.temperature - target);
    return {
      minute: Math.round(r.minute * 100) / 100,
      targetTemp: Math.round(target * 100) / 100,
      actualTemp: Math.round(r.temperature * 100) / 100,
      isAnomaly: isMinuteInAnomaly(r.minute, anomalies),
      deviation: Math.round(deviation * 100) / 100,
    };
  });
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = ['分钟', '目标温度(℃)', '实绩温度(℃)', '偏差(℃)', '是否偏离'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.minute,
        row.targetTemp ?? '',
        row.actualTemp,
        row.deviation ?? '',
        row.isAnomaly ? '是' : '否',
      ].join(',')
    );
  }
  return BOM + lines.join('\r\n');
}

export function generateFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `kiln-export-${stamp}.csv`;
}
