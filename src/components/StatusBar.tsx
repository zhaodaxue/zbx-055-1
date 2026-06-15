import { Flame, Thermometer, AlertTriangle, Activity, Clock } from 'lucide-react';
import { useKilnStore } from '../store/kilnStore';
import { interpolateTargetTemperature } from '../utils/curveUtils';

export function StatusBar() {
  const { targetCurve, readings, anomalies, isSampling, samplingStartTime } =
    useKilnStore();

  const lastReading = readings[readings.length - 1];
  const currentMinute = lastReading?.minute ?? 0;
  const currentTemp = lastReading?.temperature ?? 0;
  const targetTemp = targetCurve
    ? interpolateTargetTemperature(targetCurve.points, currentMinute)
    : 0;
  const deviation = currentTemp - targetTemp;
  const hasAnomaly = anomalies.length > 0;

  const elapsed = samplingStartTime
    ? Math.floor((Date.now() - samplingStartTime) / 1000)
    : 0;
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;

  return (
    <div className="bg-gradient-to-r from-[#1a1410] via-[#241a14] to-[#1a1410] border-b-2 border-[#ff6b35]/40 px-8 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#ff6b35]/20 flex items-center justify-center border border-[#ff6b35]/40">
            <Flame className="w-7 h-7 text-[#ff6b35]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#ffedd5] tracking-wide">
              窑炉还原焰监控台
            </h1>
            <p className="text-xs text-[#fbbf24]/70">Kiln Reduction-Firing Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
            <Thermometer className="w-5 h-5 text-[#f4a261]" />
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">当前温度</div>
              <div className="text-2xl font-bold text-[#f4a261] tabular-nums">
                {currentTemp.toFixed(1)}
                <span className="text-sm text-white/40 ml-1">℃</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
            <Activity className="w-5 h-5 text-[#457b9d]" />
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">目标温度</div>
              <div className="text-2xl font-bold text-[#457b9d] tabular-nums">
                {targetTemp.toFixed(1)}
                <span className="text-sm text-white/40 ml-1">℃</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
            <AlertTriangle
              className={`w-5 h-5 ${
                Math.abs(deviation) > 25 ? 'text-[#e63946]' : 'text-[#86efac]'
              }`}
            />
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">偏差</div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  Math.abs(deviation) > 25
                    ? 'text-[#e63946]'
                    : deviation >= 0
                    ? 'text-[#86efac]'
                    : 'text-[#fbbf24]'
                }`}
              >
                {deviation >= 0 ? '+' : ''}
                {deviation.toFixed(1)}
                <span className="text-sm text-white/40 ml-1">℃</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
            <Clock className="w-5 h-5 text-white/50" />
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">运行时长</div>
              <div className="text-2xl font-bold text-white/80 tabular-nums">
                {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-lg border border-white/5">
            <div
              className={`w-3 h-3 rounded-full ${
                isSampling
                  ? 'bg-[#86efac] animate-pulse shadow-[0_0_10px_#86efac]'
                  : 'bg-white/20'
              }`}
            />
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">
                {isSampling ? '采集中' : '待机'}
              </div>
              <div className="text-lg font-bold text-white/80 tabular-nums">
                {readings.length} 点
              </div>
            </div>
          </div>

          {hasAnomaly && (
            <div className="px-4 py-2 bg-[#e63946]/20 rounded-lg border border-[#e63946]/60 animate-pulse">
              <div className="text-[10px] text-[#e63946] uppercase tracking-wider font-bold">
                ⚠ 检测到偏离
              </div>
              <div className="text-lg font-bold text-[#e63946]">
                {anomalies.length} 段
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
