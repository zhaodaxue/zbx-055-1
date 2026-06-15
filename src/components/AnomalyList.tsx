import { AlertTriangle, Clock, Gauge } from 'lucide-react';
import { useKilnStore } from '../store/kilnStore';

export function AnomalyList() {
  const { anomalies, targetCurve } = useKilnStore();

  return (
    <div className="bg-[#241a14]/80 border border-[#ff6b35]/20 rounded-2xl p-5 backdrop-blur-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#ffedd5] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e63946]" />
          偏离段告警
        </h2>
        <span
          className={`text-[10px] px-2 py-1 rounded-full border ${
            anomalies.length > 0
              ? 'bg-[#e63946]/20 text-[#e63946] border-[#e63946]/40'
              : 'bg-[#86efac]/10 text-[#86efac] border-[#86efac]/30'
          }`}
        >
          {anomalies.length > 0 ? `${anomalies.length} 段异常` : '运行正常'}
        </span>
      </div>

      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {!targetCurve ? (
          <div className="h-full flex flex-col items-center justify-center text-white/25 text-center px-4">
            <AlertTriangle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">下达曲线后开始检测偏离</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[#86efac]/10 flex items-center justify-center mb-3">
              <Gauge className="w-6 h-6 text-[#86efac]" />
            </div>
            <p className="text-sm font-medium text-[#86efac]/80">温度运行正常</p>
            <p className="text-xs mt-1 opacity-60">连续 3 个采样点偏差超过 25℃ 将告警</p>
          </div>
        ) : (
          anomalies.map((a, idx) => (
            <div
              key={a.id}
              className="bg-[#e63946]/10 border border-[#e63946]/30 rounded-xl p-3 animate-[fadeIn_0.3s_ease-out]"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#e63946]" />
                  <span className="text-sm font-bold text-[#e63946]">
                    偏离段 #{idx + 1}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/30">
                  {a.pointCount} 个采样点
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-white/60">
                  <Clock className="w-3 h-3" />
                  <span>开始</span>
                  <span className="ml-auto text-[#fbbf24] font-mono font-bold">
                    {a.startMinute.toFixed(1)} 分
                  </span>
                </div>
                <div className="flex items-center gap-1 text-white/60">
                  <Clock className="w-3 h-3" />
                  <span>结束</span>
                  <span className="ml-auto text-[#fbbf24] font-mono font-bold">
                    {a.endMinute.toFixed(1)} 分
                  </span>
                </div>
                <div className="flex items-center gap-1 text-white/60 col-span-2 pt-1 border-t border-white/5">
                  <Gauge className="w-3 h-3" />
                  <span>最大偏差</span>
                  <span className="ml-auto text-[#e63946] font-mono font-bold text-sm">
                    {a.maxDeviation.toFixed(1)} ℃
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
