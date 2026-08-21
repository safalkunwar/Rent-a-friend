export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

export const formatFirestoreError = (error: unknown): ApiError => {
  if (error instanceof Error) {
    return {
      code: 'firestore/unknown',
      message: error.message,
    };
  }
  return {
    code: 'firestore/unknown',
    message: 'An unknown Firestore error occurred',
  };
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> => {
  const { maxRetries = 3, delayMs = 1000 } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
};

export const createActionHandler = <T>(
  actionFn: () => Promise<T>,
  options: {
    onSuccess?: (result: T) => void;
    onError?: (error: ApiError) => void;
    onFinally?: () => void;
    maxRetries?: number;
  } = {}
) => {
  const { onSuccess, onError, onFinally, maxRetries = 3 } = options;

  return async () => {
    try {
      const result = await withRetry(actionFn, { maxRetries });
      onSuccess?.(result);
      return result;
    } catch (error) {
      const apiError = formatFirestoreError(error);
      onError?.(apiError);
      throw apiError;
    } finally {
      onFinally?.();
    }
  };
};
