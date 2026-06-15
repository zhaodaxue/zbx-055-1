import { useState } from 'react';
import { Download, CalendarRange } from 'lucide-react';
import { useKilnStore, getExportUrl } from '../store/kilnStore';

export function ExportPanel() {
  const { targetCurve, readings } = useKilnStore();
  const [fromMinute, setFromMinute] = useState<string>('');
  const [toMinute, setToMinute] = useState<string>('');

  const handleExport = () => {
    if (!targetCurve) return;
    const params: Record<string, string> = { curveId: String(targetCurve.id) };
    if (fromMinute !== '') params.fromMinute = fromMinute;
    if (toMinute !== '') params.toMinute = toMinute;
    const query = new URLSearchParams(params).toString();
    const url = `/api/export/csv?${query}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiln-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const disabled = !targetCurve || readings.length === 0;

  return (
    <div className="bg-[#241a14]/80 border border-[#ff6b35]/20 rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#ffedd5] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
          数据导出
        </h2>
        <span className="text-[10px] text-white/40">共 {readings.length} 条记录</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            起始分钟
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={fromMinute}
            onChange={(e) => setFromMinute(e.target.value)}
            placeholder="留空=全部"
            disabled={disabled}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-[#ff6b35]/50 focus:ring-1 focus:ring-[#ff6b35]/30 disabled:opacity-40 placeholder:text-white/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            结束分钟
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={toMinute}
            onChange={(e) => setToMinute(e.target.value)}
            placeholder="留空=全部"
            disabled={disabled}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-[#ff6b35]/50 focus:ring-1 focus:ring-[#ff6b35]/30 disabled:opacity-40 placeholder:text-white/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/35 mb-4">
        <CalendarRange className="w-3.5 h-3.5" />
        <span>导出列：分钟 / 目标温度 / 实绩温度 / 偏差 / 是否偏离</span>
      </div>

      <button
        onClick={handleExport}
        disabled={disabled}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#1a1410] font-bold text-sm shadow-lg shadow-[#fbbf24]/15 hover:shadow-[#fbbf24]/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        导出 CSV
      </button>
    </div>
  );
}
