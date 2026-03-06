/**
 * S3 Service Types and Interfaces
 * 
 * Defines the minimal, type-safe interface for S3 operations.
 * 
 * Note: Using explicit undefined inclusion for strict optional property checks.
 */

// Re-export AWS SDK types we depend on

/**
 * S3 Service Configuration
 */
export interface S3Config {
  /** AWS region */
  region: string;
  /** Bucket name */
  bucket: string;
  /** Optional: endpoint URL for S3-compatible services (e.g., MinIO, LocalStack) */
  endpoint?: string;
}

/**
 * S3 Operation Options
 * Common options across operations
 */
export interface S3OperationOptions {
  /** Optional abort signal for cancellation */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Get Object Request
 */
export interface GetObjectRequest {
  /** Object key */
  key: string;
  /** Optional: specific version ID */
  versionId?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Get Object Result
 */
export interface GetObjectResult {
  /** Object content as Buffer */
  body: Buffer;
  /** Content-Type header */
  contentType: string;
  /** Content length in bytes */
  contentLength: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** ETag (MD5 hash) */
  etag: string;
  /** Metadata attached to object */
  metadata: Record<string, string>;
  /** Version ID if bucket has versioning enabled */
  versionId?: string | undefined;
}

/**
 * Put Object Request
 */
export interface PutObjectRequest {
  /** Object key */
  key: string;
  /** Object content */
  body: Buffer | string;
  /** Optional: Content-Type (default: application/octet-stream) */
  contentType?: string | undefined;
  /** Optional: Additional metadata */
  metadata?: Record<string, string> | undefined;
  /** Optional: Storage class (default: STANDARD) */
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'GLACIER' | 'DEEP_ARCHIVE' | 'STANDARD_IA' | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Put Object Result
 */
export interface PutObjectResult {
  /** ETag of uploaded object */
  etag: string;
  /** Version ID if bucket has versioning enabled */
  versionId?: string | undefined;
}

/**
 * Delete Object Request
 */
export interface DeleteObjectRequest {
  /** Object key to delete */
  key: string;
  /** Optional: specific version ID (for versioned buckets) */
  versionId?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Delete Object Result
 */
export interface DeleteObjectResult {
  /** Whether deletion succeeded */
  success: boolean;
  /** Version ID of deleted marker (if versioned) */
  deleteMarkerVersionId?: string | undefined;
}

/**
 * List Objects Request
 */
export interface ListObjectsRequest {
  /** Prefix to filter objects (e.g., "uploads/2024/") */
  prefix?: string | undefined;
  /** Maximum keys to return (default: 1000) */
  maxKeys?: number | undefined;
  /** Continuation token for pagination */
  continuationToken?: string | undefined;
  /** Delimiter for folder-like listing (default: /) */
  delimiter?: string | undefined;
  /** Include objects in tombstone state */
  includeDeleted?: boolean | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * S3 Object representation
 */
export interface S3Object {
  /** Object key */
  key: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** ETag */
  etag: string;
  /** Size in bytes */
  size: number;
  /** Storage class */
  storageClass: string;
  /** Is this object in a tombstone (soft-deleted) state */
  isDeleted?: boolean | undefined;
}

/**
 * Common prefix (folder) in list results
 */
export interface S3CommonPrefix {
  /** Prefix value */
  prefix: string;
}

/**
 * List Objects Result
 */
export interface ListObjectsResult {
  /** Objects in this page */
  objects: S3Object[];
  /** Common prefixes (folders) */
  commonPrefixes: S3CommonPrefix[];
  /** Total count of objects (may be truncated) */
  keyCount: number;
  /** Number of objects in this response */
  maxKeys: number;
  /** Whether results are truncated */
  isTruncated: boolean;
  /** Token for next page if truncated */
  nextContinuationToken?: string | undefined;
}

/**
 * Head Object Request
 */
export interface HeadObjectRequest {
  /** Object key */
  key: string;
  /** Optional: version ID */
  versionId?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Head Object Result (metadata only)
 */
export interface HeadObjectResult {
  /** Content-Type */
  contentType: string;
  /** Content length in bytes */
  contentLength: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** ETag */
  etag: string;
  /** Metadata attached to object */
  metadata: Record<string, string>;
  /** Version ID if bucket has versioning enabled */
  versionId?: string | undefined;
}

// ====================
// Tombstone Support
// ====================

/** Tombstone marker prefix */
export const TOMBSTONE_PREFIX = '.tombstone/';

/**
 * Tombstone metadata stored with soft-deleted objects
 */
export interface TombstoneMetadata {
  /** Original key before deletion */
  originalKey: string;
  /** Deletion timestamp */
  deletedAt: Date;
  /** Original deletion reason */
  reason?: string | undefined;
  /** Original content metadata (cached for restore) */
  originalMetadata?: Record<string, string> | undefined;
  /** Original Content length */
  originalSize?: number | undefined;
  /** Original content type */
  originalContentType?: string | undefined;
}

/**
 * Soft delete request
 */
export interface SoftDeleteRequest {
  /** Object key to soft-delete */
  key: string;
  /** Optional: reason for deletion (audit trail) */
  reason?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Soft delete result
 */
export interface SoftDeleteResult {
  /** Whether soft-delete succeeded */
  success: boolean;
  /** Tombstone key where metadata is stored */
  tombstoneKey: string;
  /** Timestamp of deletion */
  deletedAt: Date;
}

/**
 * Restore request
 */
export interface RestoreRequest {
  /** Object key to restore */
  key: string;
  /** Optional: restore to different key */
  targetKey?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Restore result
 */
export interface RestoreResult {
  /** Whether restore succeeded */
  success: boolean;
  /** Restored key */
  restoredKey: string;
  /** Timestamp of restore */
  restoredAt: Date;
}

/**
 * List tombstones request
 */
export interface ListTombstonesRequest {
  /** Filter by original key prefix */
  prefix?: string | undefined;
  /** Maximum results (default: 1000) */
  maxKeys?: number | undefined;
  /** Continuation token for pagination */
  continuationToken?: string | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Tombstone entry
 */
export interface TombstoneEntry {
  /** Tombstone key */
  tombstoneKey: string;
  /** Original key */
  originalKey: string;
  /** Deletion timestamp */
  deletedAt: Date;
  /** Deletion reason */
  reason?: string | undefined;
  /** Size of original content */
  originalSize?: number | undefined;
}

/**
 * List tombstones result
 */
export interface ListTombstonesResult {
  /** Tombstone entries */
  tombstones: TombstoneEntry[];
  /** Pagination token */
  nextContinuationToken?: string | undefined;
}

// ====================
// Presigned URLs
// ====================

/**
 * Presigned URL operation type
 */
export type PresignedOperation = 'getObject' | 'putObject';

/**
 * Presigned URL request
 */
export interface GetPresignedUrlRequest {
  /** Operation type */
  operation: PresignedOperation;
  /** Object key */
  key: string;
  /** Optional: expiration time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days) */
  expiresIn?: number | undefined;
  /** Optional: content type for putObject (recommended for PUT operations) */
  contentType?: string | undefined;
}

/**
 * Presigned URL result
 */
export interface GetPresignedUrlResult {
  /** Presigned URL */
  url: string;
  /** Expiration time in seconds */
  expiresIn: number;
  /** Expiration timestamp */
  expiresAt: Date;
}

// ====================
// Multipart Upload
// ====================

/**
 * Multipart upload initiation request
 */
export interface CreateMultipartUploadRequest {
  /** Object key */
  key: string;
  /** Optional: Content-Type */
  contentType?: string | undefined;
  /** Optional: metadata */
  metadata?: Record<string, string> | undefined;
  /** Optional: storage class */
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'GLACIER' | 'DEEP_ARCHIVE' | 'STANDARD_IA' | undefined;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Create multipart upload result
 */
export interface CreateMultipartUploadResult {
  /** Upload ID for subsequent parts */
  uploadId: string;
  /** Object key */
  key: string;
}

/**
 * Upload part request
 */
export interface UploadPartRequest {
  /** Object key */
  key: string;
  /** Upload ID from createMultipartUpload */
  uploadId: string;
  /** Part number (1-10000) */
  partNumber: number;
  /** Part content */
  body: Buffer;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Part upload result
 */
export interface UploadPartResult {
  /** ETag for this part */
  etag: string;
  /** Part number */
  partNumber: number;
}

/**
 * Complete multipart upload request
 */
export interface CompleteMultipartUploadRequest {
  /** Object key */
  key: string;
  /** Upload ID */
  uploadId: string;
  /** List of completed parts (must be sorted by partNumber) */
  parts: { partNumber: number; etag: string }[];
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

/**
 * Complete multipart upload result
 */
export interface CompleteMultipartUploadResult {
  /** Location URL of the completed upload */
  location?: string | undefined;
  /** ETag */
  etag: string;
  /** Version ID if versioned */
  versionId?: string | undefined;
}

/**
 * Abort multipart upload request
 */
export interface AbortMultipartUploadRequest {
  /** Object key */
  key: string;
  /** Upload ID */
  uploadId: string;
  /** Optional abort signal */
  abortSignal?: AbortSignal | undefined;
}

// ====================
// S3 Service Interface
// ====================

/**
 * Minimal S3 Service Interface
 */
export interface IS3Service {
  // Core CRUD operations
  getObject(request: GetObjectRequest): Promise<GetObjectResult>;
  putObject(request: PutObjectRequest): Promise<PutObjectResult>;
  deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResult>;
  listObjects(request: ListObjectsRequest): Promise<ListObjectsResult>;
  headObject(request: HeadObjectRequest): Promise<HeadObjectResult | null>;
  objectExists(key: string): Promise<boolean>;

  // Tombstone (soft delete) operations
  softDelete(request: SoftDeleteRequest): Promise<SoftDeleteResult>;
  restore(request: RestoreRequest): Promise<RestoreResult>;
  listTombstones(request: ListTombstonesRequest): Promise<ListTombstonesResult>;
  purgeTombstone(key: string): Promise<boolean>;

  // Presigned URLs
  getPresignedUrl(request: GetPresignedUrlRequest): Promise<GetPresignedUrlResult>;

  // Multipart uploads
  createMultipartUpload(request: CreateMultipartUploadRequest): Promise<CreateMultipartUploadResult>;
  uploadPart(request: UploadPartRequest): Promise<UploadPartResult>;
  completeMultipartUpload(request: CompleteMultipartUploadRequest): Promise<CompleteMultipartUploadResult>;
  abortMultipartUpload(request: AbortMultipartUploadRequest): Promise<void>;

  // Lifecycle
  destroy(): Promise<void>;
}

// ====================
// Error Types
// ====================

/**
 * S3 Service Error Base
 */
export class S3ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'S3ServiceError';
    Object.setPrototypeOf(this, S3ServiceError.prototype);
  }
}

/**
 * Object not found error
 */
export class ObjectNotFoundError extends S3ServiceError {
  constructor(key: string, originalError?: Error) {
    super(`Object not found: ${key}`, 'NotFound', 'getObject', originalError);
    this.name = 'ObjectNotFoundError';
  }
}

/**
 * Access denied error
 */
export class AccessDeniedError extends S3ServiceError {
  constructor(operation: string, key: string, originalError?: Error) {
    super(`Access denied for ${operation}: ${key}`, 'AccessDenied', operation, originalError);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Bucket not found error
 */
export class BucketNotFoundError extends S3ServiceError {
  constructor(bucket: string, originalError?: Error) {
    super(`Bucket not found: ${bucket}`, 'NoSuchBucket', 'bucketOperation', originalError);
    this.name = 'BucketNotFoundError';
  }
}

/**
 * Tombstone error - attempt to access soft-deleted object
 */
export class TombstoneError extends S3ServiceError {
  constructor(
    public readonly key: string,
    public readonly tombstoneKey: string,
    public readonly deletedAt: Date
  ) {
    super(
      `Object ${key} was soft-deleted at ${deletedAt.toISOString()} (tombstone: ${tombstoneKey})`,
      'ObjectTombstoned',
      'accessObject'
    );
    this.name = 'TombstoneError';
  }
}
