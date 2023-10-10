export function queryParamToBoolean(value: string | undefined) {
  return value === 'true' ? true : false;
}
