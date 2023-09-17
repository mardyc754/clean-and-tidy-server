import { dayjs } from '~/lib';

export function now() {
  return dayjs(Date.now()); // for safety, it'd be better to change the date to UTC
}
