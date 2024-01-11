import { afterEach, beforeEach, vi } from 'vitest';

import resetDb from './resetDb';

beforeEach(async () => {
  await resetDb();
  vi.resetAllMocks();
});

afterEach(async () => {
  await resetDb();
  vi.resetAllMocks();
});
