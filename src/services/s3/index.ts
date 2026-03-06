/**
 * S3 Service Module
 * 
 * A complete S3 abstraction layer with:
 * - Type-safe CRUD operations
 * - Tombstone support for soft deletes
 * - Presigned URLs for client-offload
 * - Multipart uploads for large files
 * - Comprehensive error types
 * 
 * @example
 * ```typescript
 * import { S3Service } from './services/s3';
 * 
 * const s3 = new S3Service({
 *   region: 'us-east-1',
 *   bucket: 'my-bucket',
 *   endpoint: 'http://localhost:9000', // Optional: for MinIO/LocalStack
 * });
 * 
 * // Upload a file
 * await s3.putObject({
 *   key: 'documents/contract.pdf',
 *   body: buffer,
 *   contentType: 'application/pdf',
 * });
 * 
 * // Soft delete (mark as deleted)
 * await s3.softDelete({ key: 'documents/contract.pdf', reason: 'Expired' });
 * 
 * // List with pagination
 * const { objects, nextContinuationToken } = await s3.listObjects({ prefix: 'documents/' });
 * 
 * // Cleanup
 * await s3.destroy();
 * ```
 */

// Re-export all types
export * from './types';

// Re-export service class
export { S3Service } from './s3.service';

// Version marker for compatibility checking
export const S3_SERVICE_VERSION = '1.0.0';
