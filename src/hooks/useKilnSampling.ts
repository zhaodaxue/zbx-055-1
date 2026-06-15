import { useEffect, useRef } from 'react';
import {
  fetchAnomalies,
  postReading,
  useKilnStore,
} from '../store/kilnStore';
import { interpolateTargetTemperature } from '../utils/curveUtils';

export function useKilnSampling() {
  const {
    targetCurve,
    isSampling,
    samplingStartTime,
    addReading,
    setAnomalies,
    setError,
    setSamplingStartTime,
  } = useKilnStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!isSampling || !targetCurve) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!samplingStartTime) {
      setSamplingStartTime(Date.now());
      tickRef.current = 0;
    }

    intervalRef.current = setInterval(async () => {
      tickRef.current += 1;
      const elapsedSec = tickRef.current * 30;
      const minute = elapsedSec / 60;

      const targetTemp = interpolateTargetTemperature(
        targetCurve.points,
        minute
      );
      const noise = (Math.random() - 0.5) * 20;
      let actualTemp = targetTemp + noise;
      if (tickRef.current >= 5 && tickRef.current <= 9) {
        actualTemp = targetTemp + 40 + Math.random() * 20;
      }
      actualTemp = Math.max(0, Math.min(1400, actualTemp));

      try {
        const reading = await postReading(
          targetCurve.id,
          minute,
          Math.round(actualTemp * 100) / 100
        );
        addReading(reading);
        const anomalies = await fetchAnomalies(targetCurve.id);
        setAnomalies(anomalies);
      } catch (err) {
        setError(err instanceof Error ? err.message : '采样失败');
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isSampling,
    targetCurve,
    samplingStartTime,
    addReading,
    setAnomalies,
    setError,
    setSamplingStartTime,
  ]);
}
