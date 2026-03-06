/**
 * S3 Service Implementation
 * 
 * A robust, type-safe S3 service using AWS SDK v3.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  NoSuchKey,
  NoSuchBucket,
} from '@aws-sdk/client-s3';
import type {
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
  HeadObjectCommandInput,
  CreateMultipartUploadCommandInput,
  UploadPartCommandInput,
  CompleteMultipartUploadCommandInput,
  AbortMultipartUploadCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { HttpHandlerOptions } from '@aws-sdk/types';

import type {
  S3Config,
  GetObjectRequest,
  GetObjectResult,
  PutObjectRequest,
  PutObjectResult,
  DeleteObjectRequest,
  DeleteObjectResult,
  ListObjectsRequest,
  ListObjectsResult,
  S3Object,
  S3CommonPrefix,
  HeadObjectRequest,
  HeadObjectResult,
  SoftDeleteRequest,
  SoftDeleteResult,
  RestoreRequest,
  RestoreResult,
  ListTombstonesRequest,
  ListTombstonesResult,
  TombstoneEntry,
  GetPresignedUrlRequest,
  GetPresignedUrlResult,
  CreateMultipartUploadRequest,
  CreateMultipartUploadResult,
  UploadPartRequest,
  UploadPartResult,
  CompleteMultipartUploadRequest,
  CompleteMultipartUploadResult,
  AbortMultipartUploadRequest,
  IS3Service,
} from './types';

import {
  TOMBSTONE_PREFIX,
  S3ServiceError,
  ObjectNotFoundError,
  AccessDeniedError,
  BucketNotFoundError,
} from './types';

// Constants
const DEFAULT_EXPIRATION = 3600; // 1 hour
const MAX_EXPIRATION = 604800; // 7 days (S3 limit)
const DEFAULT_MAX_KEYS = 1000;

// Helper to generate tombstone key
const getTombstoneKey = (originalKey: string): string => {
  const timestamp = Date.now();
  const safeKey = Buffer.from(originalKey).toString('base64url');
  return `${TOMBSTONE_PREFIX}${timestamp}/${safeKey}`;
};

// Helper to parse tombstone key
const parseTombstoneKey = (tombstoneKey: string): { timestamp: number; originalKey: string } | null => {
  if (!tombstoneKey.startsWith(TOMBSTONE_PREFIX)) return null;
  
  const withoutPrefix = tombstoneKey.slice(TOMBSTONE_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf('/');
  if (slashIndex === -1) return null;
  
  const timestamp = parseInt(withoutPrefix.slice(0, slashIndex), 10);
  if (isNaN(timestamp)) return null;
  
  const encodedKey = withoutPrefix.slice(slashIndex + 1);
  const originalKey = Buffer.from(encodedKey, 'base64url').toString('utf-8');
  
  return { timestamp, originalKey };
};

// Helper to build HttpHandlerOptions from abortSignal
function buildHttpOptions(abortSignal?: AbortSignal | undefined): HttpHandlerOptions {
  if (abortSignal) {
    return { abortSignal };
  }
  return {};
}

/**
 * S3 Service Implementation
 * 
 * Thread-safe singleton pattern - create one instance per application lifecycle.
 * Call destroy() before disposing the service to release HTTP connections.
 */
export class S3Service implements IS3Service {
  private client: S3Client;
  private config: S3Config;
  private destroyed = false;

  constructor(config: S3Config) {
    this.config = config;
    
    // Configure HTTP handler with reasonable timeouts
    const requestHandler = new NodeHttpHandler({
      connectionTimeout: 30000, // 30s connection timeout
      socketTimeout: 300000,    // 5min socket timeout for large uploads
    });
    
    // Build client configuration
    const clientConfig: any = {
      region: config.region,
      requestHandler,
      maxAttempts: 3, // Retry failed requests
    };
    
    // Endpoint override for S3-compatible services (MinIO, LocalStack, etc)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      // Override for path-style URLs (required for some S3-compatible services)
      clientConfig.forcePathStyle = true;
    }
    
    this.client = new S3Client(clientConfig);
  }

  /**
   * Validate service isn't destroyed
   */
  private checkDestroyed(): void {
    if (this.destroyed) {
      throw new S3ServiceError('S3Service has been destroyed', 'ServiceDestroyed', 'check');
    }
  }

  /**
   * Wrap an error in appropriate typed error
   */
  private wrapError(error: unknown, operation: string, key?: string): S3ServiceError {
    if (error instanceof S3ServiceError) return error;
    
    const originalError = error instanceof Error ? error : new Error(String(error));
    
    if (error instanceof NoSuchKey || (originalError.name === 'NoSuchKey')) {
      return new ObjectNotFoundError(key || 'unknown', originalError);
    }
    
    if (error instanceof NoSuchBucket || (originalError.name === 'NoSuchBucket')) {
      return new BucketNotFoundError(this.config.bucket, originalError);
    }
    
    // Check error codes for access denied
    const errorCode = (error as any)?.Code || (error as any)?.code;
    if (errorCode === 'AccessDenied' || errorCode === 'Forbidden') {
      return new AccessDeniedError(operation, key || 'unknown', originalError);
    }
    
    return new S3ServiceError(
      originalError.message,
      errorCode || 'UnknownError',
      operation,
      originalError
    );
  }

  /**
   * Get object by key
   */
  async getObject(request: GetObjectRequest): Promise<GetObjectResult> {
    this.checkDestroyed();
    
    const { key, versionId, abortSignal } = request;
    
    try {
      const input: GetObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
      };
      
      if (versionId !== undefined) {
        input.VersionId = versionId;
      }
      
      const command = new GetObjectCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      // Stream to buffer for ease of use
      const chunks: Buffer[] = [];
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
      }
      
      const body = Buffer.concat(chunks);
      
      return {
        body,
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength ?? body.length,
        lastModified: response.LastModified ?? new Date(),
        etag: response.ETag ?? '',
        metadata: response.Metadata ?? {},
        versionId: response.VersionId,
      };
    } catch (error) {
      throw this.wrapError(error, 'getObject', key);
    }
  }

  /**
   * Store object
   */
  async putObject(request: PutObjectRequest): Promise<PutObjectResult> {
    this.checkDestroyed();
    
    const { key, body, contentType, metadata, storageClass, abortSignal } = request;
    
    try {
      const input: PutObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        Body: Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8'),
        ContentType: contentType ?? 'application/octet-stream',
        Metadata: metadata,
        StorageClass: storageClass ?? 'STANDARD',
      };
      
      const command = new PutObjectCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        etag: response.ETag ?? '',
        versionId: response.VersionId,
      };
    } catch (error) {
      throw this.wrapError(error, 'putObject', key);
    }
  }

  /**
   * Delete object (hard delete)
   */
  async deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResult> {
    this.checkDestroyed();
    
    const { key, versionId, abortSignal } = request;
    
    try {
      const input: DeleteObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
      };
      
      if (versionId !== undefined) {
        input.VersionId = versionId;
      }
      
      const command = new DeleteObjectCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        success: true,
        deleteMarkerVersionId: response.VersionId,
      };
    } catch (error) {
      // Soft-fail on not found - object is already deleted
      if (error instanceof NoSuchKey || (error as Error)?.name === 'NoSuchKey') {
        return { success: true };
      }
      throw this.wrapError(error, 'deleteObject', key);
    }
  }

  /**
   * List objects with pagination
   */
  async listObjects(request: ListObjectsRequest): Promise<ListObjectsResult> {
    this.checkDestroyed();
    
    const {
      prefix,
      maxKeys = DEFAULT_MAX_KEYS,
      continuationToken,
      delimiter = '/',
      includeDeleted = false,
      abortSignal,
    } = request;
    
    try {
      // Build list of prefixes to exclude
      const excludePrefixes: string[] = [];
      if (!includeDeleted) {
        excludePrefixes.push(TOMBSTONE_PREFIX);
      }
      
      const input: ListObjectsV2CommandInput = {
        Bucket: this.config.bucket,
        MaxKeys: Math.min(maxKeys, 1000), // S3 max is 1000
        Delimiter: delimiter,
      };
      
      if (prefix !== undefined && prefix !== '') {
        input.Prefix = prefix;
      }
      
      if (continuationToken !== undefined && continuationToken !== '') {
        input.ContinuationToken = continuationToken;
      }
      
      const command = new ListObjectsV2Command(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      // Filter and transform objects
      const objects: S3Object[] = (response.Contents || [])
        .filter(obj => !excludePrefixes.some(exclude => obj.Key?.startsWith(exclude)))
        .map(obj => ({
          key: obj.Key!,
          lastModified: obj.LastModified ?? new Date(),
          etag: obj.ETag ?? '',
          size: obj.Size ?? 0,
          storageClass: obj.StorageClass ?? 'STANDARD',
        }));
      
      // Transform common prefixes
      const commonPrefixes: S3CommonPrefix[] = (response.CommonPrefixes || [])
        .filter(cp => !excludePrefixes.some(exclude => cp.Prefix?.startsWith(exclude)))
        .map(cp => ({ prefix: cp.Prefix! }));
      
      return {
        objects,
        commonPrefixes,
        keyCount: response.KeyCount ?? 0,
        maxKeys: response.MaxKeys ?? maxKeys,
        isTruncated: response.IsTruncated ?? false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      throw this.wrapError(error, 'listObjects', prefix ?? '');
    }
  }

  /**
   * Get object metadata without downloading content
   */
  async headObject(request: HeadObjectRequest): Promise<HeadObjectResult | null> {
    this.checkDestroyed();
    
    const { key, versionId, abortSignal } = request;
    
    try {
      const input: HeadObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
      };
      
      if (versionId !== undefined) {
        input.VersionId = versionId;
      }
      
      const command = new HeadObjectCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength ?? 0,
        lastModified: response.LastModified ?? new Date(),
        etag: response.ETag ?? '',
        metadata: response.Metadata ?? {},
        versionId: response.VersionId,
      };
    } catch (error) {
      if (error instanceof NoSuchKey || (error as Error)?.name === 'NoSuchKey') {
        return null;
      }
      throw this.wrapError(error, 'headObject', key);
    }
  }

  /**
   * Check if object exists
   */
  async objectExists(key: string): Promise<boolean> {
    const result = await this.headObject({ key });
    return result !== null;
  }

  // ====================
  // Tombstone Operations
  // ====================

  /**
   * Soft delete object (create tombstone)
   * 
   * Implementation: Store tombstone metadata in a separate prefix.
   * The original object is NOT deleted - caller must choose to
   * hard-delete separately if desired.
   */
  async softDelete(request: SoftDeleteRequest): Promise<SoftDeleteResult> {
    this.checkDestroyed();
    
    const { key, reason, abortSignal } = request;
    
    // First, get current object metadata
    const headResult = await this.headObject({ key, abortSignal });
    if (!headResult) {
      throw new ObjectNotFoundError(key);
    }
    
    const deletedAt = new Date();
    const tombstoneKey = getTombstoneKey(key);
    
    const tombstoneMetadata = {
      originalKey: key,
      deletedAt,
      reason,
      originalMetadata: headResult.metadata,
      originalSize: headResult.contentLength,
      originalContentType: headResult.contentType,
    };
    
    // Store tombstone marker
    await this.putObject({
      key: tombstoneKey,
      body: JSON.stringify(tombstoneMetadata),
      contentType: 'application/json',
      metadata: {
        'x-tombstone-original-key': key,
        'x-tombstone-deleted-at': deletedAt.toISOString(),
      },
      abortSignal,
    });
    
    return {
      success: true,
      tombstoneKey,
      deletedAt,
    };
  }

  /**
   * Restore a soft-deleted object
   * 
   * Note: This only removes the tombstone marker. If the content
   * was also hard-deleted, this will fail.
   */
  async restore(request: RestoreRequest): Promise<RestoreResult> {
    this.checkDestroyed();
    
    const { key, targetKey, abortSignal } = request;
    const restoredKey = targetKey ?? key;
    const restoredAt = new Date();
    
    // Try to find and parse tombstone
    const tombstones = await this.listTombstones({ abortSignal });
    const tombstone = tombstones.tombstones.find(t => t.originalKey === key);
    
    if (!tombstone) {
      throw new S3ServiceError(
        `No tombstone found for key: ${key}`,
        'TombstoneNotFound',
        'restore'
      );
    }
    
    // Verify original still exists
    const headResult = await this.headObject({ key, abortSignal });
    if (!headResult) {
      throw new S3ServiceError(
        `Cannot restore ${key}: content was hard-deleted`,
        'ContentDeleted',
        'restore'
      );
    }
    
    // Copy to target if different
    if (restoredKey !== key) {
      // Get and put the content
      const content = await this.getObject({ key, abortSignal });
      await this.putObject({
        key: restoredKey,
        body: content.body,
        contentType: content.contentType,
        metadata: content.metadata,
        abortSignal,
      });
    }
    
    // Delete tombstone marker
    await this.deleteObject({ key: tombstone.tombstoneKey, abortSignal });
    
    return {
      success: true,
      restoredKey,
      restoredAt,
    };
  }

  /**
   * List all tombstones
   */
  async listTombstones(request: ListTombstonesRequest = {}): Promise<ListTombstonesResult> {
    this.checkDestroyed();
    
    const { prefix, maxKeys = DEFAULT_MAX_KEYS, continuationToken, abortSignal } = request;
    
    const listResult = await this.listObjects({
      prefix: TOMBSTONE_PREFIX + (prefix ?? ''),
      maxKeys,
      continuationToken,
      includeDeleted: true,
      abortSignal,
    });
    
    const tombstones: TombstoneEntry[] = [];
    
    for (const obj of listResult.objects) {
      const parsed = parseTombstoneKey(obj.key);
      if (parsed) {
        try {
          // Try to load metadata from content
          const metadataContent = await this.getObject({ key: obj.key, abortSignal });
          const metadata: { originalKey: string; deletedAt: string; reason?: string; originalSize?: number; } = JSON.parse(metadataContent.body.toString('utf-8'));
          
          tombstones.push({
            tombstoneKey: obj.key,
            originalKey: parsed.originalKey,
            deletedAt: new Date(parsed.timestamp),
            reason: metadata.reason,
            originalSize: metadata.originalSize,
          });
        } catch {
          // Parse failed - still include with basic info
          tombstones.push({
            tombstoneKey: obj.key,
            originalKey: parsed.originalKey,
            deletedAt: new Date(parsed.timestamp),
          });
        }
      }
    }
    
    return {
      tombstones,
      nextContinuationToken: listResult.nextContinuationToken,
    };
  }

  /**
   * Permanently delete a tombstone marker
   * Useful for cleanup operations
   */
  async purgeTombstone(tombstoneKey: string): Promise<boolean> {
    this.checkDestroyed();
    
    if (!tombstoneKey.startsWith(TOMBSTONE_PREFIX)) {
      return false;
    }
    
    try {
      await this.deleteObject({ key: tombstoneKey });
      return true;
    } catch {
      return false;
    }
  }

  // ====================
  // Presigned URLs
  // ====================

  /**
   * Generate presigned URL for GET or PUT
   * 
   * Note: The URL will be valid for expiresIn seconds (max 7 days).
   * Client must use appropriate HTTP method with the URL.
   */
  async getPresignedUrl(request: GetPresignedUrlRequest): Promise<GetPresignedUrlResult> {
    this.checkDestroyed();
    
    const { operation, key, expiresIn: requestedExpires, contentType } = request;
    
    // Clamp expiration
    const expiresIn = Math.min(
      Math.max(requestedExpires ?? DEFAULT_EXPIRATION, 1),
      MAX_EXPIRATION
    );
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    try {
      let command;
      
      if (operation === 'getObject') {
        command = new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });
      } else if (operation === 'putObject') {
        const input: PutObjectCommandInput = {
          Bucket: this.config.bucket,
          Key: key,
        };
        if (contentType !== undefined) {
          input.ContentType = contentType;
        }
        command = new PutObjectCommand(input);
      } else {
        throw new S3ServiceError(
          `Unsupported operation: ${operation}`,
          'InvalidOperation',
          'getPresignedUrl'
        );
      }
      
      const url = await getSignedUrl(this.client, command, { expiresIn });
      
      return {
        url,
        expiresIn,
        expiresAt,
      };
    } catch (error) {
      throw this.wrapError(error, 'getPresignedUrl', key);
    }
  }

  // ====================
  // Multipart Uploads
  // ====================

  /**
   * Initiate multipart upload
   */
  async createMultipartUpload(
    request: CreateMultipartUploadRequest
  ): Promise<CreateMultipartUploadResult> {
    this.checkDestroyed();
    
    const { key, contentType, metadata, storageClass, abortSignal } = request;
    
    try {
      const input: CreateMultipartUploadCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        ContentType: contentType ?? 'application/octet-stream',
        Metadata: metadata,
        StorageClass: storageClass ?? 'STANDARD',
      };
      
      const command = new CreateMultipartUploadCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        uploadId: response.UploadId ?? '',
        key,
      };
    } catch (error) {
      throw this.wrapError(error, 'createMultipartUpload', key);
    }
  }

  /**
   * Upload a single part of multipart upload
   */
  async uploadPart(request: UploadPartRequest): Promise<UploadPartResult> {
    this.checkDestroyed();
    
    const { key, uploadId, partNumber, body, abortSignal } = request;
    
    // Validate part number
    if (partNumber < 1 || partNumber > 10000) {
      throw new S3ServiceError(
        `Part number must be between 1 and 10000, got ${partNumber}`,
        'InvalidPartNumber',
        'uploadPart'
      );
    }
    
    try {
      const input: UploadPartCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      };
      
      const command = new UploadPartCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        etag: response.ETag ?? '',
        partNumber,
      };
    } catch (error) {
      throw this.wrapError(error, 'uploadPart', key);
    }
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    request: CompleteMultipartUploadRequest
  ): Promise<CompleteMultipartUploadResult> {
    this.checkDestroyed();
    
    const { key, uploadId, parts, abortSignal } = request;
    
    // Sort parts by number (S3 requirement)
    const sortedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    
    try {
      const input: CompleteMultipartUploadCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts.map(p => ({
            ETag: p.etag,
            PartNumber: p.partNumber,
          })),
        },
      };
      
      const command = new CompleteMultipartUploadCommand(input);
      const response = await this.client.send(command, buildHttpOptions(abortSignal));
      
      return {
        location: response.Location,
        etag: response.ETag ?? '',
        versionId: response.VersionId,
      };
    } catch (error) {
      throw this.wrapError(error, 'completeMultipartUpload', key);
    }
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(request: AbortMultipartUploadRequest): Promise<void> {
    this.checkDestroyed();
    
    const { key, uploadId, abortSignal } = request;
    
    try {
      const input: AbortMultipartUploadCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId,
      };
      
      const command = new AbortMultipartUploadCommand(input);
      await this.client.send(command, buildHttpOptions(abortSignal));
    } catch (error) {
      // Ignore errors for already-aborted or non-existent uploads
      const errorCode = (error as any)?.Code;
      if (errorCode !== 'NoSuchUpload') {
        throw this.wrapError(error, 'abortMultipartUpload', key);
      }
    }
  }

  /**
   * Cleanup resources
   * Must be called before disposing the service to release
   * HTTP connections and event loop handles.
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    
    this.destroyed = true;
    
    // Destroy the S3 client to release connections
    this.client.destroy();
  }
}
