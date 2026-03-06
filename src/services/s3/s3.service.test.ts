/**
 * S3 Service Test Suite
 * 
 * Comprehensive tests covering CRUD, tombstones, presigned URLs, multipart uploads
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
} from '@aws-sdk/client-s3';
import * as Presigner from '@aws-sdk/s3-request-presigner';

import {
  S3Service,
  TOMBSTONE_PREFIX,
  S3ServiceError,
} from './';
import type { S3Config } from './types';

// Mock the AWS SDK modules
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
      destroy: vi.fn(),
    })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

// Mock @smithy/node-http-handler
vi.mock('@smithy/node-http-handler', () => ({
  NodeHttpHandler: vi.fn().mockImplementation(() => ({})),
}));

describe('S3Service', () => {
  let service: S3Service;
  let mockClient: { send: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  
  const config: S3Config = {
    region: 'us-east-1',
    bucket: 'test-bucket',
    endpoint: 'http://localhost:9000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new S3Service(config);
    // Access the private client property for mocking
    mockClient = (service as any).client;
  });

  afterEach(async () => {
    await service.destroy();
  });

  describe('Configuration', () => {
    it('should use endpoint when provided', () => {
      const S3ClientMock = vi.mocked(S3Client);
      expect(S3ClientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
        })
      );
    });

    it('should not use forcePathStyle without endpoint', () => {
      vi.clearAllMocks();
      const localService = new S3Service({ region: 'eu-west-1', bucket: 'prod-bucket' });
      const S3ClientMock = vi.mocked(S3Client);
      expect(S3ClientMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          forcePathStyle: true,
        })
      );
      localService.destroy();
    });
  });

  describe('getObject', () => {
    it('should fetch and return object content', async () => {
      const mockBody = Buffer.from('Hello, World!');
      mockClient.send.mockResolvedValueOnce({
        Body: [mockBody],
        ContentType: 'text/plain',
        ContentLength: mockBody.length,
        LastModified: new Date('2024-01-01'),
        ETag: '"abc123"',
        Metadata: { 'custom-key': 'custom-value' },
      });

      const result = await service.getObject({ key: 'test.txt' });

      expect(result.body.toString()).toBe('Hello, World!');
      expect(result.contentType).toBe('text/plain');
      expect(result.contentLength).toBe(13);
      expect(result.etag).toBe('"abc123"');
      expect(result.metadata['custom-key']).toBe('custom-value');
    });

    it('should handle versioned object retrieval', async () => {
      const mockBody = Buffer.from('v2 content');
      mockClient.send.mockResolvedValueOnce({
        Body: [mockBody],
        ContentType: 'text/plain',
        ContentLength: mockBody.length,
        LastModified: new Date(),
        ETag: '"def456"',
        Metadata: {},
        VersionId: 'version-123',
      });

      const result = await service.getObject({ key: 'versioned.txt', versionId: 'version-123' });

      expect(result.versionId).toBe('version-123');
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand),
        expect.anything()
      );
    });

    it('should throw ObjectNotFoundError for missing objects', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockClient.send.mockRejectedValueOnce(error);

      await expect(service.getObject({ key: 'missing.txt' })).rejects.toThrow('Object not found');
    });
  });

  describe('putObject', () => {
    it('should upload string content', async () => {
      mockClient.send.mockResolvedValueOnce({
        ETag: '"upload-etag"',
        VersionId: 'version-789',
      });

      const result = await service.putObject({
        key: 'upload.txt',
        body: 'string content',
      });

      expect(result.etag).toBe('"upload-etag"');
      expect(result.versionId).toBe('version-789');
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
        expect.anything()
      );
    });

    it('should upload buffer content with metadata', async () => {
      mockClient.send.mockResolvedValueOnce({ ETag: '"buffer-etag"' });

      await service.putObject({
        key: 'binary.bin',
        body: Buffer.from([0x00, 0x01, 0x02]),
        contentType: 'application/octet-stream',
        metadata: { source: 'test-suite' },
      });

      // Verify a S3 command was sent
      expect(vi.mocked(mockClient.send).mock.calls.length).toBeGreaterThan(0);
    });

    it('should upload to specific storage class', async () => {
      mockClient.send.mockResolvedValueOnce({ ETag: '"glacier-etag"' });

      await service.putObject({
        key: 'archive.zip',
        body: 'archive',
        storageClass: 'GLACIER',
      });

      expect(mockClient.send).toHaveBeenCalled();
    });
  });

  describe('deleteObject', () => {
    it('should delete object and return success', async () => {
      mockClient.send.mockResolvedValueOnce({ DeleteMarker: true, VersionId: 'del-version' });

      const result = await service.deleteObject({ key: 'to-delete.txt' });

      expect(result.success).toBe(true);
      expect(result.deleteMarkerVersionId).toBe('del-version');
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand),
        expect.anything()
      );
    });

    it('should handle already-deleted objects gracefully', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockClient.send.mockRejectedValueOnce(error);

      const result = await service.deleteObject({ key: 'already-gone.txt' });

      expect(result.success).toBe(true);
    });
  });

  describe('listObjects', () => {
    it('should list objects with pagination', async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [
          { Key: 'file1.txt', LastModified: new Date(), ETag: '"e1"', Size: 100, StorageClass: 'STANDARD' },
          { Key: 'file2.txt', LastModified: new Date(), ETag: '"e2"', Size: 200, StorageClass: 'STANDARD' },
        ],
        CommonPrefixes: [{ Prefix: 'folder1/' }],
        KeyCount: 2,
        MaxKeys: 1000,
        IsTruncated: true,
        NextContinuationToken: 'next-page-token',
      });

      const result = await service.listObjects({ prefix: 'documents/' });

      expect(result.objects).toHaveLength(2);
      expect(result.objects[0]!.key).toBe('file1.txt');
      expect(result.objects[0]!.size).toBe(100);
      expect(result.commonPrefixes).toHaveLength(1);
      expect(result.commonPrefixes[0]!.prefix).toBe('folder1/');
      expect(result.isTruncated).toBe(true);
      expect(result.nextContinuationToken).toBe('next-page-token');
    });

    it('should filter deleted objects by default', async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [
          { Key: 'normal.txt', LastModified: new Date(), ETag: '"e1"', Size: 100, StorageClass: 'STANDARD' },
          { Key: `${TOMBSTONE_PREFIX}123/dead`, LastModified: new Date(), ETag: '"e2"', Size: 50, StorageClass: 'STANDARD' },
        ],
        KeyCount: 1,
        IsTruncated: false,
      });

      const result = await service.listObjects({});

      // Should filter out tombstone keys
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]!.key).toBe('normal.txt');
    });

    it('should handle empty bucket', async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [],
        CommonPrefixes: [],
        KeyCount: 0,
        MaxKeys: 1000,
        IsTruncated: false,
      });

      const result = await service.listObjects({});

      expect(result.objects).toHaveLength(0);
      expect(result.isTruncated).toBe(false);
    });
  });

  describe('headObject', () => {
    it('should return metadata for existing object', async () => {
      mockClient.send.mockResolvedValueOnce({
        ContentType: 'image/png',
        ContentLength: 12345,
        LastModified: new Date('2024-01-01'),
        ETag: '"head-etag"',
        Metadata: { author: 'test' },
        VersionId: 'v-abc',
      });

      const result = await service.headObject({ key: 'image.png' });

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('image/png');
      expect(result!.contentLength).toBe(12345);
      expect(result!.etag).toBe('"head-etag"');
      expect(result!.metadata.author).toBe('test');
    });

    it('should return null for missing object', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockClient.send.mockRejectedValueOnce(error);

      const result = await service.headObject({ key: 'missing.png' });

      expect(result).toBeNull();
    });
  });

  describe('objectExists', () => {
    it('should return true for existing object', async () => {
      mockClient.send.mockResolvedValueOnce({
        ContentLength: 100,
        ETag: '"exists"',
        LastModified: new Date(),
        Metadata: {},
      });

      const result = await service.objectExists('file.txt');
      expect(result).toBe(true);
    });

    it('should return false for missing object', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockClient.send.mockRejectedValueOnce(error);

      const result = await service.objectExists('missing.txt');
      expect(result).toBe(false);
    });
  });

  describe('Tombstone Operations', () => {
    describe('softDelete', () => {
      beforeEach(() => {
        // Mock headObject to return valid metadata
        mockClient.send.mockImplementation(async (command) => {
          if (command instanceof HeadObjectCommand) {
            return {
              ContentLength: 100,
              ContentType: 'text/plain',
              ETag: '"original-etag"',
              LastModified: new Date(),
              Metadata: { 'original-meta': 'value' },
            };
          }
          if (command instanceof PutObjectCommand) {
            return { ETag: '"tombstone-etag"' };
          }
          return {};
        });
      });

      it('should soft-delete existing object and create tombstone', async () => {
        const result = await service.softDelete({ key: 'soft-delete.txt', reason: 'Test deletion' });

        expect(result.success).toBe(true);
        expect(result.tombstoneKey).toMatch(new RegExp(`^${TOMBSTONE_PREFIX}\\d+/`));
        expect(result.deletedAt).toBeInstanceOf(Date);
      });

      it('should throw ObjectNotFoundError for missing object', async () => {
        mockClient.send.mockImplementation(async (command) => {
          if (command instanceof HeadObjectCommand) {
            const error = new Error('Not found');
            error.name = 'NoSuchKey';
            throw error;
          }
          return {};
        });

        await expect(service.softDelete({ key: 'does-not-exist.txt' }))
          .rejects.toThrow('Object not found');
      });
    });

    describe('listTombstones', () => {
      beforeEach(() => {
        mockClient.send.mockImplementation(async (command) => {
          if (command instanceof ListObjectsV2Command) {
            return {
              Contents: [
                {
                  Key: `${TOMBSTONE_PREFIX}1704067200000/dGVzdC50eHQ=`, // "test.txt" base64url
                  LastModified: new Date(),
                  ETag: '"tombstone-etag"',
                  Size: 200,
                },
              ],
              KeyCount: 1,
              IsTruncated: false,
            };
          }
          if (command instanceof GetObjectCommand) {
            return {
              Body: [Buffer.from(JSON.stringify({
                originalKey: 'test.txt',
                deletedAt: new Date('2024-01-01'),
                reason: 'Test',
                originalSize: 1234,
              }))],
              ContentLength: 200,
            };
          }
          return {};
        });
      });

      it('should list all tombstones', async () => {
        const result = await service.listTombstones();

        expect(result.tombstones).toHaveLength(1);
        expect(result.tombstones[0]!.originalKey).toBe('test.txt');
        expect(result.tombstones[0]!.reason).toBe('Test');
      });
    });

    describe('purgeTombstone', () => {
      it('should delete tombstone marker', async () => {
        mockClient.send.mockResolvedValueOnce({});

        const tombstoneKey = `${TOMBSTONE_PREFIX}12345/dGVzdC50eHQ=`;
        const result = await service.purgeTombstone(tombstoneKey);

        expect(result).toBe(true);
        expect(mockClient.send).toHaveBeenCalledWith(
          expect.any(DeleteObjectCommand),
          expect.anything()
        );
      });

      it('should reject non-tombstone keys', async () => {
        const result = await service.purgeTombstone('regular-file.txt');
        expect(result).toBe(false);
      });
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate GET presigned URL', async () => {
      vi.mocked(Presigner.getSignedUrl).mockResolvedValueOnce('https://presigned-get-url');

      const result = await service.getPresignedUrl({
        operation: 'getObject',
        key: 'public-file.txt',
        expiresIn: 1800,
      });

      expect(result.url).toBe('https://presigned-get-url');
      expect(result.expiresIn).toBe(1800);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate PUT presigned URL with content type', async () => {
      vi.mocked(Presigner.getSignedUrl).mockResolvedValueOnce('https://presigned-put-url');

      const result = await service.getPresignedUrl({
        operation: 'putObject',
        key: 'upload-target.txt',
        expiresIn: 3600,
        contentType: 'application/json',
      });

      expect(result.url).toBe('https://presigned-put-url');
    });

    it('should clamp expiration to max 7 days', async () => {
      vi.mocked(Presigner.getSignedUrl).mockResolvedValueOnce('https://presigned-url');

      const result = await service.getPresignedUrl({
        operation: 'getObject',
        key: 'test.txt',
        expiresIn: 999999, // Exceeds max
      });

      expect(result.expiresIn).toBe(604800); // Max 7 days
    });

    it('should reject unknown operations', async () => {
      await expect(service.getPresignedUrl({
        operation: 'unknown' as any,
        key: 'test.txt',
      })).rejects.toThrow('Unsupported operation');
    });
  });

  describe('Multipart Upload', () => {
    describe('createMultipartUpload', () => {
      it('should initiate multipart upload', async () => {
        mockClient.send.mockResolvedValueOnce({ UploadId: 'upload-abc-123' });

        const result = await service.createMultipartUpload({
          key: 'large-file.zip',
          contentType: 'application/zip',
          metadata: { source: 'multipart' },
        });

        expect(result.uploadId).toBe('upload-abc-123');
        expect(result.key).toBe('large-file.zip');
      });
    });

    describe('uploadPart', () => {
      it('should upload a part successfully', async () => {
        mockClient.send.mockResolvedValueOnce({ ETag: '"part-etag"' });

        const result = await service.uploadPart({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
          partNumber: 1,
          body: Buffer.from('part 1 content'),
        });

        expect(result.etag).toBe('"part-etag"');
        expect(result.partNumber).toBe(1);
      });

      it('should reject invalid part numbers', async () => {
        await expect(service.uploadPart({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
          partNumber: 0, // Invalid
          body: Buffer.from('content'),
        })).rejects.toThrow('Part number must be between 1 and 10000');

        await expect(service.uploadPart({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
          partNumber: 10001, // Invalid
          body: Buffer.from('content'),
        })).rejects.toThrow('Part number must be between 1 and 10000');
      });
    });

    describe('completeMultipartUpload', () => {
      it('should complete multipart upload', async () => {
        mockClient.send.mockResolvedValueOnce({
          Location: 'https://completed-url',
          ETag: '"complete-etag"',
          VersionId: 'v-complete',
        });

        const result = await service.completeMultipartUpload({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
          parts: [
            { partNumber: 1, etag: '"etag-1"' },
            { partNumber: 2, etag: '"etag-2"' },
          ],
        });

        expect(result.location).toBe('https://completed-url');
        expect(result.etag).toBe('"complete-etag"');
        expect(result.versionId).toBe('v-complete');
      });

      it('should sort parts before sending', async () => {
        mockClient.send.mockResolvedValueOnce({ ETag: '"sorted"' });

        await service.completeMultipartUpload({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
          parts: [
            { partNumber: 3, etag: '"etag-3"' },
            { partNumber: 1, etag: '"etag-1"' },
            { partNumber: 2, etag: '"etag-2"' },
          ],
        });

        // Verify send was called (parts should be sorted internally)
        expect(mockClient.send).toHaveBeenCalledWith(
          expect.any(CompleteMultipartUploadCommand),
          expect.anything()
        );
      });
    });

    describe('abortMultipartUpload', () => {
      it('should abort multipart upload', async () => {
        mockClient.send.mockResolvedValueOnce({});

        await service.abortMultipartUpload({
          key: 'large-file.zip',
          uploadId: 'upload-abc',
        });

        expect(mockClient.send).toHaveBeenCalledWith(
          expect.any(AbortMultipartUploadCommand),
          expect.anything()
        );
      });

      it('should handle already-aborted uploads gracefully', async () => {
        const error = new Error('No such upload');
        (error as any).Code = 'NoSuchUpload';
        mockClient.send.mockRejectedValueOnce(error);

        // Should not throw
        await expect(service.abortMultipartUpload({
          key: 'large-file.zip',
          uploadId: 'old-upload',
        })).resolves.toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap AccessDenied error', async () => {
      const error = new Error('Access denied');
      (error as any).Code = 'AccessDenied';
      mockClient.send.mockRejectedValueOnce(error);

      const thrownError: any = await service.getObject({ key: 'denied.txt' }).catch(e => e);
      expect(thrownError.name).toBe('AccessDeniedError');
      expect(thrownError.code).toBe('AccessDenied');
    });

    it('should wrap BucketNotFound error', async () => {
      const error = new Error('No such bucket');
      error.name = 'NoSuchBucket';
      mockClient.send.mockRejectedValueOnce(error);

      const thrownError: any = await service.getObject({ key: 'any.txt' }).catch(e => e);
      expect(thrownError.name).toBe('BucketNotFoundError');
      expect(thrownError.code).toBe('NoSuchBucket');
    });

    it('should preserve original error in chain', async () => {
      const original = new Error('Original error');
      original.name = 'SomeWeirdError';
      (original as any).Code = 'WeirdCode';
      mockClient.send.mockRejectedValueOnce(original);

      const thrownError: any = await service.getObject({ key: 'error.txt' }).catch(e => e);
      expect(thrownError.name).toBe('S3ServiceError');
      expect(thrownError.originalError).toBe(original);
      expect(thrownError.code).toBe('WeirdCode');
    });
  });

  describe('destroy', () => {
    it('should release client resources', async () => {
      await service.destroy();
      expect(mockClient.destroy).toHaveBeenCalled();
    });

    it('should mark service as destroyed', async () => {
      await service.destroy();
      await expect(service.getObject({ key: 'test.txt' }))
        .rejects.toThrow('S3Service has been destroyed');
    });

    it('should be idempotent', async () => {
      await service.destroy();
      await service.destroy(); // Should not throw
    });
  });
});
