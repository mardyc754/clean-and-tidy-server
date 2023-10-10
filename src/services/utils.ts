export async function executeDatabaseOperation<T>(transaction: Promise<T>) {
  let result: T | null = null;
  try {
    result = await transaction;
  } catch (err) {
    console.error(err);
  }

  return result;
}
