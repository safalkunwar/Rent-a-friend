import { OperationType, handleFirestoreError } from '../services/firestore-errors';

export interface RepositoryOptions {
  useCache?: boolean;
  retryCount?: number;
}

export class BaseRepository {
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: any,
    path: string,
    retries = 3,
    delay = 500
  ): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          handleFirestoreError(error, operationType, path);
          throw error;
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
    throw new Error('Operation failed after retries');
  }
}
