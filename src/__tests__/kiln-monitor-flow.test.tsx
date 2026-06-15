import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  setupTestEnvironment,
  createTestCurve,
  createTestReadings,
  createTestAnomaly,
  setupMockWithHistory,
  useKilnStore,
  setMockAnomalies,
  setMockReadings,
} from '../test/testUtils';
import { useKilnSampling } from '../hooks/useKilnSampling';
import { StatusBar } from '../components/StatusBar';
import { AnomalyList } from '../components/AnomalyList';
import { TemperatureChart } from '../components/TemperatureChart';
import { CurveInputTable } from '../components/CurveInputTable';
import { getCallLog, getMockReadings } from '../test/mocks/fetchMock';
import type { TemperatureReading } from '../types';

setupTestEnvironment();

function TestApp({ withChart = true }: { withChart?: boolean }) {
  useKilnSampling();
  return (
    <div>
      <StatusBar />
      <div data-testid="main-content">
        <CurveInputTable />
        {withChart && <TemperatureChart />}
        <AnomalyList />
      </div>
    </div>
  );
}

describe('窑炉监控台主链路测试', () => {
  describe('1. 历史读数恢复采样 - tick 从最后一条读数对齐', () => {
    it('恢复采样时，首次上报的 minute 应从最后一条读数之后的下一个 tick 开始', async () => {
      const curve = createTestCurve(1);
      const historyReadings = createTestReadings(1, 4, 0, 0.5);
      setupMockWithHistory(curve, historyReadings);
      const lastMinute = historyReadings[historyReadings.length - 1].minute;

      render(<TestApp withChart={false} />);

      await act(async () => {
        useKilnStore.getState().setSampling(true);
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const readings = useKilnStore.getState().readings;
      expect(readings.length).toBeGreaterThan(historyReadings.length);

      const newReadings = readings.filter((r) => r.minute > lastMinute);
      expect(newReadings.length).toBeGreaterThan(0);

      const firstNewMinute = newReadings[0].minute;
      const expectedNextMinute = (Math.floor(lastMinute * 60 / 30) + 1) * 30 / 60;
      expect(firstNewMinute).toBeCloseTo(expectedNextMinute, 5);
    });

    it('恢复采样后，tick 计数不从 0 开始而是延续', async () => {
      const curve = createTestCurve(2);
      const historyReadings = createTestReadings(2, 6, 0, 0.5);
      setupMockWithHistory(curve, historyReadings);

      render(<TestApp withChart={false} />);

      await act(async () => {
        useKilnStore.getState().setSampling(true);
      });

      const initialCount = useKilnStore.getState().readings.length;

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const afterOneTick = useKilnStore.getState().readings.length;
      expect(afterOneTick).toBe(initialCount + 1);
    });
  });

  describe('2. 采样链路 - postReading 与 fetchAnomalies 按序调用', () => {
    it('每次采样 tick 按序调用：先 postReading 后 fetchAnomalies', async () => {
      const curve = createTestCurve(3);
      setupMockWithHistory(curve, []);

      render(<TestApp withChart={false} />);

      await act(async () => {
        useKilnStore.getState().setSampling(true);
      });

      const beforeCount = getCallLog().length;

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const calls = getCallLog();
      const newCalls = calls.slice(beforeCount);

      const postReadingIdx = newCalls.findIndex((c) => c.startsWith('POST /api/readings'));
      const getAnomaliesIdx = newCalls.findIndex((c) => c.includes('anomalies'));

      expect(postReadingIdx).toBeGreaterThan(-1);
      expect(getAnomaliesIdx).toBeGreaterThan(-1);
      expect(postReadingIdx).toBeLessThan(getAnomaliesIdx);
    });

    it('连续采样时，store 中 readings 递增、anomalies 更新', async () => {
      const curve = createTestCurve(4);
      setupMockWithHistory(curve, []);

      render(<TestApp withChart={false} />);

      await act(async () => {
        useKilnStore.getState().setSampling(true);
      });

      const initialReadingsLen = useKilnStore.getState().readings.length;
      const initialAnomaliesLen = useKilnStore.getState().anomalies.length;

      await act(async () => {
        for (let i = 0; i < 3; i++) {
          vi.advanceTimersByTime(30000);
          await Promise.resolve();
          await Promise.resolve();
        }
      });

      const finalReadings = useKilnStore.getState().readings;
      expect(finalReadings.length).toBe(initialReadingsLen + 3);
      expect(finalReadings[0].minute).toBeLessThan(finalReadings[1].minute);
      expect(finalReadings[1].minute).toBeLessThan(finalReadings[2].minute);

      const anomalies = useKilnStore.getState().anomalies;
      expect(anomalies.length).toBeGreaterThanOrEqual(initialAnomaliesLen);
    });

    it('第 5-9 次采样人为偏高后，anomalies 数量增加', async () => {
      const curve = createTestCurve(5);
      setupMockWithHistory(curve, []);

      render(<TestApp withChart={false} />);

      await act(async () => {
        useKilnStore.getState().setSampling(true);
      });

      for (let i = 0; i < 4; i++) {
        await act(async () => {
          vi.advanceTimersByTime(30000);
          await Promise.resolve();
          await Promise.resolve();
        });
      }

      const beforeAnomalies = useKilnStore.getState().anomalies.length;

      const incrementAnomalies = [
        createTestAnomaly(2.0, 4.5, 45.2),
      ];
      setMockAnomalies(incrementAnomalies);

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
        await Promise.resolve();
      });

      const afterAnomalies = useKilnStore.getState().anomalies.length;
      expect(afterAnomalies).toBeGreaterThan(beforeAnomalies);
    });
  });

  describe('3. 三处 UI 同步告警', () => {
    it('StatusBar 偏差绝对值 >25℃ 时显示红色偏差', () => {
      const curve = createTestCurve(6, [
        { minute: 0, temperature: 200 },
        { minute: 10, temperature: 200 },
      ]);
      const readings: TemperatureReading[] = [
        { id: 1, curveId: 6, minute: 5, temperature: 260, timestamp: '2026-06-15T10:05:00Z' },
      ];
      const anomalies = [createTestAnomaly(5, 6, 60)];

      setupMockWithHistory(curve, readings, anomalies);

      render(<StatusBar />);

      const deviationText = screen.getByText('偏差');
      expect(deviationText).toBeInTheDocument();

      const alertTriangle = document.querySelector('.text-\\[\\#e63946\\]');
      expect(alertTriangle).toBeInTheDocument();
    });

    it('AnomalyList 段数与 store 中 anomalies 数量一致', () => {
      const curve = createTestCurve(7);
      const readings = createTestReadings(7, 10);
      const anomalies = [
        createTestAnomaly(1.0, 2.5, 35),
        createTestAnomaly(4.0, 5.0, 42),
      ];

      setupMockWithHistory(curve, readings, anomalies);

      render(<AnomalyList />);

      const anomalyItems = screen.getAllByText(/偏离段 #\d+/);
      expect(anomalyItems.length).toBe(anomalies.length);
    });

    it('TemperatureChart 偏离 overlay 的 left/width 与 anomaly 起止分钟、maxMinute 计算一致', () => {
      const curve = createTestCurve(8, [
        { minute: 0, temperature: 25 },
        { minute: 10, temperature: 200 },
      ]);
      const readings = createTestReadings(8, 10, 0, 0.5);
      const anomalies = [createTestAnomaly(2.0, 4.0, 30)];

      setupMockWithHistory(curve, readings, anomalies);

      const { container } = render(<TemperatureChart />);

      const overlayDivs = container.querySelectorAll('.absolute.pointer-events-none');
      expect(overlayDivs.length).toBe(anomalies.length);

      const maxMinute = Math.max(
        curve.points[curve.points.length - 1].minute,
        readings[readings.length - 1].minute,
        10
      );

      const anomaly = anomalies[0];
      const expectedLeft = (anomaly.startMinute / maxMinute) * 100;
      const expectedWidth = ((anomaly.endMinute - anomaly.startMinute) / maxMinute) * 100;

      const firstOverlay = overlayDivs[0] as HTMLElement;
      const leftStyle = firstOverlay.style.left;
      const widthStyle = firstOverlay.style.width;

      expect(parseFloat(leftStyle)).toBeCloseTo(expectedLeft, 0);
      expect(parseFloat(widthStyle)).toBeGreaterThan(0);
      expect(parseFloat(widthStyle)).toBeLessThanOrEqual(100);
    });

    it('出现偏离后 StatusBar 显示告警徽章', () => {
      const curve = createTestCurve(9);
      const readings = createTestReadings(9, 8);
      const anomalies = [createTestAnomaly(2, 3.5, 38)];

      setupMockWithHistory(curve, readings, anomalies);

      render(<StatusBar />);

      const alertBadge = screen.getByText(/检测到偏离/);
      expect(alertBadge).toBeInTheDocument();

      const anomalyCountBadge = screen.getByText(/\d+ 段/);
      expect(anomalyCountBadge).toBeInTheDocument();
    });
  });

  describe('4. 采样进行中修改左侧曲线表不应被回写覆盖', () => {
    it('采样中输入框为 disabled 状态', () => {
      const curve = createTestCurve(10, [
        { minute: 0, temperature: 25 },
        { minute: 60, temperature: 800 },
      ]);
      setupMockWithHistory(curve, []);

      const { rerender } = render(<TestApp withChart={false} />);

      act(() => {
        useKilnStore.getState().setSampling(true);
      });

      rerender(<TestApp withChart={false} />);

      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it('采样中表格显示的点数与 targetCurve 一致', () => {
      const curve = createTestCurve(11, [
        { minute: 0, temperature: 25 },
        { minute: 30, temperature: 500 },
        { minute: 60, temperature: 800 },
      ]);
      setupMockWithHistory(curve, []);

      render(<TestApp withChart={false} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(curve.points.length * 2);
    });

    it('停止采样后，表格仍显示当前 targetCurve 的点', () => {
      const curve = createTestCurve(12, [
        { minute: 0, temperature: 100 },
        { minute: 20, temperature: 400 },
        { minute: 40, temperature: 700 },
      ]);
      setupMockWithHistory(curve, []);

      render(<TestApp withChart={false} />);

      const inputs = screen.getAllByRole('spinbutton');
      const minuteInputs = inputs.filter((_, i) => i % 2 === 0);
      const tempInputs = inputs.filter((_, i) => i % 2 === 1);

      expect(minuteInputs.length).toBe(curve.points.length);
      expect(tempInputs.length).toBe(curve.points.length);

      curve.points.forEach((point, idx) => {
        expect((minuteInputs[idx] as HTMLInputElement).value).toBe(String(point.minute));
        expect((tempInputs[idx] as HTMLInputElement).value).toBe(String(point.temperature));
      });
    });
  });
});
