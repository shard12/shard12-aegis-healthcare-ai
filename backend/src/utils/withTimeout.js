/**
 * Race an async operation against a hard wall-clock timeout.
 * Used by AEGIS AI providers so a hung socket never blocks the Express event loop indefinitely.
 *
 * @param {number} ms Maximum wait (milliseconds)
 * @param {() => Promise<unknown>} fn Factory that starts the async work when invoked (so the timer starts before I/O)
 * @returns {Promise<unknown>}
 */
export async function withTimeout(ms, fn) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`timeout_after_${ms}ms`);
      err.code = 'TIMEOUT';
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
