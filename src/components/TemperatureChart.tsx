import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function TemperatureChart() {
  const { targetCurve, readings, anomalies } = useKilnStore();

  const chartData = useMemo(() => {
    if (!targetCurve) {
      return {
        labels: [] as string[],
        datasets: [],
      };
    }

    const maxMinute = Math.max(
      targetCurve.points[targetCurve.points.length - 1].minute,
      readings.length > 0 ? readings[readings.length - 1].minute : 0,
      10
    );
    const step = Math.max(1, Math.ceil(maxMinute / 20));
    const labels: string[] = [];
    for (let m = 0; m <= maxMinute; m += step) {
      labels.push(String(m));
    }

    const targetData = labels.map((l) =>
      interpolateTargetTemperature(targetCurve.points, parseFloat(l))
    );

    const actualByMinute = new Map<number, number>();
    readings.forEach((r) => {
      actualByMinute.set(r.minute, r.temperature);
    });
    const actualData = labels.map((l) => {
      const m = parseFloat(l);
      return actualByMinute.has(m) ? (actualByMinute.get(m) as number) : null;
    });

    const anomalyBg = labels.map((l) => {
      const m = parseFloat(l);
      const inAnomaly = anomalies.some(
        (a) => m >= a.startMinute && m <= a.endMinute
      );
      return inAnomaly ? 'rgba(230, 57, 70, 0.18)' : 'rgba(0,0,0,0)';
    });

    return {
      labels,
      datasets: [
        {
          label: '偏离区域',
          data: labels.map(() => 1400),
          backgroundColor: anomalyBg,
          fill: true,
          pointRadius: 0,
          borderWidth: 0,
          barPercentage: 1,
          order: 3,
          type: 'line' as const,
        },
        {
          label: '目标温度',
          data: targetData,
          borderColor: '#457b9d',
          backgroundColor: 'rgba(69, 123, 157, 0.1)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#457b9d',
          tension: 0.2,
          fill: false,
          order: 1,
        },
        {
          label: '实绩温度',
          data: actualData,
          borderColor: '#f4a261',
          backgroundColor: 'rgba(244, 162, 97, 0.15)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#f4a261',
          pointBorderColor: '#1a1410',
          pointBorderWidth: 1.5,
          tension: 0.25,
          fill: false,
          spanGaps: true,
          order: 0,
        },
      ],
    };
  }, [targetCurve, readings, anomalies]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffedd5',
          usePointStyle: true,
          padding: 16,
          font: { size: 12 },
          filter: (item) => item.text !== '偏离区域',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 20, 16, 0.95)',
        titleColor: '#ffedd5',
        bodyColor: '#fbbf24',
        borderColor: '#ff6b35/40',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          title: (items) => `第 ${items[0].label} 分钟`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 237, 213, 0.05)' },
        ticks: { color: '#fbbf24/60', font: { size: 11 } },
        title: {
          display: true,
          text: '时间（分钟）',
          color: '#fbbf24/70',
          font: { size: 12 },
        },
      },
      y: {
        min: 0,
        max: 1400,
        grid: { color: 'rgba(255, 237, 213, 0.05)' },
        ticks: { color: '#fbbf24/60', font: { size: 11 } },
        title: {
          display: true,
          text: '温度（℃）',
          color: '#fbbf24/70',
          font: { size: 12 },
        },
      },
    },
  };

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
      <div className="flex-1 min-h-0">
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
