/** Bound UI waits without treating a timeout as proof that a remote write failed. */
export function mediaDeadline<T>(operation: Promise<T>, phase: string, cancel?: () => void, milliseconds = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(`${phase} timed out. Check your connection and retry with the same image.`), { code: 'media/deadline-exceeded' }));
      cancel?.();
    }, milliseconds);
    operation.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
