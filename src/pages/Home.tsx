import { useEffect } from 'react';
import { StatusBar } from '../components/StatusBar';
import { CurveInputTable } from '../components/CurveInputTable';
import { TemperatureChart } from '../components/TemperatureChart';
import { AnomalyList } from '../components/AnomalyList';
import { ExportPanel } from '../components/ExportPanel';
import { useKilnSampling } from '../hooks/useKilnSampling';
import {
  fetchAnomalies,
  fetchLatestCurve,
  fetchReadings,
  useKilnStore,
} from '../store/kilnStore';

export default function Home() {
  const {
    setTargetCurve,
    setReadings,
    setAnomalies,
    setError,
    error,
  } = useKilnStore();

  useKilnSampling();

  useEffect(() => {
    (async () => {
      try {
        const curve = await fetchLatestCurve();
        if (curve) {
          setTargetCurve(curve);
          const readings = await fetchReadings(curve.id);
          setReadings(readings);
          const anomalies = await fetchAnomalies(curve.id);
          setAnomalies(anomalies);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    })();
  }, [setTargetCurve, setReadings, setAnomalies, setError]);

  return (
    <div className="min-h-screen bg-[#1a1410] text-white flex flex-col">
      <StatusBar />

      {error && (
        <div className="mx-8 mt-4 px-4 py-3 bg-[#e63946]/15 border border-[#e63946]/40 rounded-xl text-sm text-[#e63946] flex items-center gap-2">
          ⚠ {error}
        </div>
      )}

      <div className="flex-1 p-6 grid grid-cols-12 gap-5 min-h-0">
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-5">
          <div className="flex-1 min-h-[420px]">
            <CurveInputTable />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-6 flex flex-col gap-5">
          <div className="flex-1 min-h-[500px]">
            <TemperatureChart />
          </div>
          <ExportPanel />
        </div>

        <div className="col-span-12 xl:col-span-3">
          <div className="h-full min-h-[620px]">
            <AnomalyList />
          </div>
        </div>
      </div>

      <footer className="px-8 py-3 text-center text-[10px] text-white/25 border-t border-white/5">
        窑炉还原焰监控系统 · 工业级温度曲线管理 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
