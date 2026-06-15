import { useEffect, useState } from 'react';
import { Plus, Trash2, Send, RotateCcw } from 'lucide-react';
import type { CurvePoint } from '../types';
import {
  postCurve,
  useKilnStore,
} from '../store/kilnStore';

const DEFAULT_POINTS: CurvePoint[] = [
  { minute: 0, temperature: 25 },
  { minute: 30, temperature: 300 },
  { minute: 60, temperature: 600 },
  { minute: 90, temperature: 900 },
  { minute: 120, temperature: 1250 },
];

export function CurveInputTable() {
  const { targetCurve, isSampling, setTargetCurve, setSampling, setError, resetAll } =
    useKilnStore();
  const [points, setPoints] = useState<CurvePoint[]>(DEFAULT_POINTS);
  const [submitting, setSubmitting] = useState(false);
  const [syncedCurveId, setSyncedCurveId] = useState<number | null>(null);

  useEffect(() => {
    if (targetCurve && targetCurve.id !== syncedCurveId && !isSampling) {
      setPoints(targetCurve.points);
      setSyncedCurveId(targetCurve.id);
    }
  }, [targetCurve, syncedCurveId, isSampling]);

  const updatePoint = (idx: number, field: 'minute' | 'temperature', value: string) => {
    setPoints((prev) => {
      const next = [...prev];
      const num = parseFloat(value);
      next[idx] = { ...next[idx], [field]: isNaN(num) ? 0 : num };
      return next;
    });
  };

  const addPoint = () => {
    const last = points[points.length - 1];
    setPoints([
      ...points,
      { minute: (last?.minute ?? 0) + 30, temperature: last?.temperature ?? 0 },
    ]);
  };

  const removePoint = (idx: number) => {
    if (points.length <= 1) return;
    setPoints(points.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const curve = await postCurve(points);
      setTargetCurve(curve);
      resetAll();
      setSampling(true);
      setSyncedCurveId(curve.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = () => {
    setSampling(false);
  };

  const hasCurve = !!targetCurve;

  return (
    <div className="bg-[#241a14]/80 border border-[#ff6b35]/20 rounded-2xl p-5 backdrop-blur-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#ffedd5] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff6b35]" />
          目标曲线录入
        </h2>
        {hasCurve && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-[#457b9d]/20 text-[#457b9d] border border-[#457b9d]/30">
            已下达 ID:{targetCurve!.id}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto border border-white/5 rounded-xl bg-black/30">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#1a1410] z-10">
            <tr className="text-[#fbbf24]/70 text-xs">
              <th className="py-2 px-3 text-left font-medium">#</th>
              <th className="py-2 px-3 text-left font-medium">时间(分钟)</th>
              <th className="py-2 px-3 text-left font-medium">温度(℃)</th>
              <th className="py-2 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, idx) => (
              <tr
                key={idx}
                className="border-t border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-2 px-3 text-white/40 font-mono">{idx + 1}</td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={p.minute}
                    onChange={(e) => updatePoint(idx, 'minute', e.target.value)}
                    disabled={isSampling}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white/90 text-sm focus:outline-none focus:border-[#ff6b35]/50 focus:ring-1 focus:ring-[#ff6b35]/30 disabled:opacity-50 transition-all"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min="0"
                    max="1400"
                    step="1"
                    value={p.temperature}
                    onChange={(e) => updatePoint(idx, 'temperature', e.target.value)}
                    disabled={isSampling}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white/90 text-sm focus:outline-none focus:border-[#ff6b35]/50 focus:ring-1 focus:ring-[#ff6b35]/30 disabled:opacity-50 transition-all"
                  />
                </td>
                <td className="py-2 px-2">
                  <button
                    onClick={() => removePoint(idx)}
                    disabled={isSampling || points.length <= 1}
                    className="p-1.5 rounded-lg text-white/40 hover:text-[#e63946] hover:bg-[#e63946]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3">
        <button
          onClick={addPoint}
          disabled={isSampling}
          className="w-full py-2 rounded-xl border border-dashed border-white/15 text-white/50 text-sm hover:border-[#ff6b35]/50 hover:text-[#ff6b35] hover:bg-[#ff6b35]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> 添加时间点
        </button>

        {!isSampling ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#e85d2a] text-white font-bold text-sm shadow-lg shadow-[#ff6b35]/25 hover:shadow-[#ff6b35]/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? '下达中...' : hasCurve ? '重新下达曲线并启动' : '下达曲线并启动采集'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e63946] to-[#c5303d] text-white font-bold text-sm shadow-lg shadow-[#e63946]/25 hover:shadow-[#e63946]/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> 停止采集
          </button>
        )}
      </div>
    </div>
  );
}
