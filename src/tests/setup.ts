import { afterEach, beforeEach } from 'vitest';

import resetDb from './resetDb';

beforeEach(async () => {
  await resetDb();
});

afterEach(async () => {
  await resetDb();
});
