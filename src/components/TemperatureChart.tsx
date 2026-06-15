import { useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useKilnStore } from '../store/kilnStore';
import { interpolateTargetTemperature } from '../utils/curveUtils';
import type { AnomalySegment } from '../types';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function buildAnomalyBoxes(anomalies: AnomalySegment[]) {
  return anomalies.map((a) => ({
    type: 'box' as const,
    xMin: a.startMinute,
    xMax: a.endMinute,
    yMin: 0,
    yMax: 1400,
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderColor: 'rgba(230, 57, 70, 0.45)',
    borderWidth: 1,
    borderDash: [4, 3],
  }));
}

export function TemperatureChart() {
  const { targetCurve, readings, anomalies } = useKilnStore();

  const chartData = useMemo(() => {
    if (!targetCurve) {
      return { datasets: [] };
    }

    const maxMinute = Math.max(
      targetCurve.points[targetCurve.points.length - 1].minute,
      readings.length > 0 ? readings[readings.length - 1].minute : 0,
      10
    );

    const targetDense: { x: number; y: number }[] = [];
    const step = maxMinute <= 30 ? 0.5 : maxMinute <= 120 ? 1 : 5;
    for (let m = 0; m <= maxMinute + step; m += step) {
      targetDense.push({
        x: Math.round(m * 100) / 100,
        y: interpolateTargetTemperature(targetCurve.points, m),
      });
    }
    targetCurve.points.forEach((p) => {
      if (!targetDense.some((d) => Math.abs(d.x - p.minute) < 0.001)) {
        targetDense.push({ x: p.minute, y: p.temperature });
      }
    });
    targetDense.sort((a, b) => a.x - b.x);

    const actualData = readings.map((r) => ({
      x: r.minute,
      y: r.temperature,
    }));

    return {
      datasets: [
        {
          label: '目标温度',
          data: targetDense,
          borderColor: '#457b9d',
          backgroundColor: 'rgba(69, 123, 157, 0.08)',
          borderWidth: 2.5,
          pointRadius: 2.5,
          pointBackgroundColor: '#457b9d',
          tension: 0.2,
          fill: false,
          order: 1,
          parsing: false as const,
        },
        {
          label: '实绩温度',
          data: actualData,
          borderColor: '#f4a261',
          backgroundColor: 'rgba(244, 162, 97, 0.1)',
          borderWidth: 2.5,
          pointRadius: 4.5,
          pointBackgroundColor: '#f4a261',
          pointBorderColor: '#1a1410',
          pointBorderWidth: 1.5,
          tension: 0.25,
          fill: false,
          spanGaps: true,
          order: 0,
          parsing: false as const,
        },
      ],
    };
  }, [targetCurve, readings]);

  const options: ChartOptions<'line'> = useMemo(() => {
    const maxMinute = targetCurve
      ? Math.max(
          targetCurve.points[targetCurve.points.length - 1].minute,
          readings.length > 0 ? readings[readings.length - 1].minute : 0,
          10
        )
      : 100;

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest' as const,
        intersect: false,
        axis: 'x' as const,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#ffedd5',
            usePointStyle: true,
            padding: 16,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(26, 20, 16, 0.95)',
          titleColor: '#ffedd5',
          bodyColor: '#fbbf24',
          borderColor: 'rgba(255, 107, 53, 0.4)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const v = (items[0].parsed as { x: number; y: number }).x;
              return `第 ${v.toFixed(1)} 分钟`;
            },
            label: (item) => {
              const p = item.parsed as { x: number; y: number };
              return `${item.dataset.label}: ${p.y.toFixed(1)} ℃`;
            },
          },
        },
        annotation: {
          annotations: buildAnomalyBoxes(anomalies),
        } as unknown as Record<string, unknown>,
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: maxMinute,
          grid: { color: 'rgba(255, 237, 213, 0.05)' },
          ticks: {
            color: 'rgba(251, 191, 36, 0.6)',
            font: { size: 11 },
            callback: (v) => `${Number(v).toFixed(0)}`,
          },
          title: {
            display: true,
            text: '时间（分钟）',
            color: 'rgba(251, 191, 36, 0.7)',
            font: { size: 12 },
          },
        },
        y: {
          min: 0,
          max: 1400,
          grid: { color: 'rgba(255, 237, 213, 0.05)' },
          ticks: { color: 'rgba(251, 191, 36, 0.6)', font: { size: 11 } },
          title: {
            display: true,
            text: '温度（℃）',
            color: 'rgba(251, 191, 36, 0.7)',
            font: { size: 12 },
          },
        },
      },
    };
  }, [targetCurve, readings, anomalies]);

  return (
    <div className="bg-[#241a14]/80 border border-[#ff6b35]/20 rounded-2xl p-5 backdrop-blur-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[#ffedd5] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#457b9d]" />
          温度曲线对比
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#457b9d] rounded" />
            <span className="text-[#457b9d]">目标</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#f4a261] rounded" />
            <span className="text-[#f4a261]">实绩</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#e63946]/30 border border-[#e63946]/50" />
            <span className="text-[#e63946]">偏离段</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {anomalies.length > 0 && (
          <>
            {anomalies.map((a, idx) => {
              const maxMinute = targetCurve
                ? Math.max(
                    targetCurve.points[targetCurve.points.length - 1].minute,
                    readings.length > 0 ? readings[readings.length - 1].minute : 0,
                    10
                  )
                : 100;
              const leftPct = (a.startMinute / maxMinute) * 100;
              const widthPct =
                ((a.endMinute - a.startMinute) / maxMinute) * 100;
              return (
                <div
                  key={a.id ?? idx}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 0.5)}%`,
                    background:
                      'repeating-linear-gradient(45deg, rgba(230,57,70,0.12), rgba(230,57,70,0.12) 6px, rgba(230,57,70,0.22) 6px, rgba(230,57,70,0.22) 12px)',
                    borderLeft: '1px dashed rgba(230,57,70,0.6)',
                    borderRight: '1px dashed rgba(230,57,70,0.6)',
                    zIndex: 1,
                  }}
                />
              );
            })}
          </>
        )}
        {targetCurve ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
            <div className="text-5xl mb-3 opacity-30">🔥</div>
            <p className="text-sm">下达曲线后开始显示温度曲线</p>
          </div>
        )}
      </div>
    </div>
  );
}
