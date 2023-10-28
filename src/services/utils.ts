export async function executeDatabaseOperation<T>(
  transaction: Promise<T>,
  onErrorCallback?: (err?: unknown) => void
) {
  let result: T | null = null;
  try {
    result = await transaction;
  } catch (err) {
    console.error(err);
    onErrorCallback?.(err);
  }

  return result;
}
