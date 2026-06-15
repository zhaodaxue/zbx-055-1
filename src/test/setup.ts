import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    defaults: {
      global: {},
    },
  },
  CategoryScale: class {},
  LinearScale: class {},
  PointElement: class {},
  LineElement: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
  Filler: class {},
}));

vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: { data: unknown }) => {
    const { createElement } = require('react');
    return createElement('div', {
      'data-testid': 'mock-line-chart',
      'data-datasets': JSON.stringify(data),
    });
  },
}));
