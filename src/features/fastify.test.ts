import { describe, it, expect } from 'vitest';
import {
  isValidStatusCode,
  isInformational,
  isSuccess,
  isRedirect,
  isClientError,
  isServerError,
  isError,
  isOk,
  isSafe,
  getDefaultStatusCode,
  assertValidStatusCode,
  getStatusDescription,
  INFO_CODES,
  SUCCESS_CODES,
  REDIRECT_CODES,
  CLIENT_ERROR_CODES,
  SERVER_ERROR_CODES,
} from './fastify';

describe('HTTP Status Code Utilities', () => {
  describe('Constants', () => {
    it('should have correct informational codes', () => {
      expect(INFO_CODES).toEqual([100, 101, 102, 103]);
    });

    it('should have correct success codes', () => {
      expect(SUCCESS_CODES).toEqual([200, 201, 202, 203, 204, 205, 206, 207, 208, 226]);
    });

    it('should have correct redirect codes', () => {
      expect(REDIRECT_CODES).toEqual([300, 301, 302, 303, 304, 305, 307, 308]);
    });
  });

  describe('isValidStatusCode', () => {
    it('returns true for valid informational codes', () => {
      expect(isValidStatusCode(100)).toBe(true);
      expect(isValidStatusCode(101)).toBe(true);
    });

    it('returns true for valid success codes', () => {
      expect(isValidStatusCode(200)).toBe(true);
      expect(isValidStatusCode(201)).toBe(true);
      expect(isValidStatusCode(204)).toBe(true);
    });

    it('returns true for valid redirect codes', () => {
      expect(isValidStatusCode(301)).toBe(true);
      expect(isValidStatusCode(302)).toBe(true);
    });

    it('returns true for valid client error codes', () => {
      expect(isValidStatusCode(400)).toBe(true);
      expect(isValidStatusCode(404)).toBe(true);
      expect(isValidStatusCode(418)).toBe(true); // I'm a teapot
    });

    it('returns true for valid server error codes', () => {
      expect(isValidStatusCode(500)).toBe(true);
      expect(isValidStatusCode(503)).toBe(true);
    });

    it('returns false for invalid codes', () => {
      expect(isValidStatusCode(99)).toBe(false);
      expect(isValidStatusCode(600)).toBe(false);
      expect(isValidStatusCode(-1)).toBe(false);
      expect(isValidStatusCode(999)).toBe(false);
    });
  });

  describe('Category checks', () => {
    it('correctly identifies informational codes', () => {
      expect(isInformational(100)).toBe(true);
      expect(isInformational(150)).toBe(true);
      expect(isInformational(199)).toBe(true);
      expect(isInformational(200)).toBe(false);
      expect(isInformational(500)).toBe(false);
    });

    it('correctly identifies success codes', () => {
      expect(isSuccess(200)).toBe(true);
      expect(isSuccess(201)).toBe(true);
      expect(isSuccess(204)).toBe(true);
      expect(isSuccess(199)).toBe(false);
      expect(isSuccess(300)).toBe(false);
    });

    it('correctly identifies redirect codes', () => {
      expect(isRedirect(301)).toBe(true);
      expect(isRedirect(302)).toBe(true);
      expect(isRedirect(308)).toBe(true);
      expect(isRedirect(200)).toBe(false);
      expect(isRedirect(400)).toBe(false);
    });

    it('correctly identifies client error codes', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(429)).toBe(true);
      expect(isClientError(300)).toBe(false);
      expect(isClientError(500)).toBe(false);
    });

    it('correctly identifies server error codes', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(502)).toBe(true);
      expect(isServerError(503)).toBe(true);
      expect(isServerError(200)).toBe(false);
      expect(isServerError(400)).toBe(false);
    });

    it('correctly identifies any error code', () => {
      expect(isError(400)).toBe(true);
      expect(isError(500)).toBe(true);
      expect(isError(404)).toBe(true);
      expect(isError(200)).toBe(false);
      expect(isError(301)).toBe(false);
      expect(isError(100)).toBe(false);
    });
  });

  describe('Helper functions', () => {
    it('isOk returns true only for 200', () => {
      expect(isOk(200)).toBe(true);
      expect(isOk(201)).toBe(false);
      expect(isOk(199)).toBe(false);
      expect(isOk(204)).toBe(false);
    });

    it('isSafe returns true for codes under 300', () => {
      expect(isSafe(200)).toBe(true);
      expect(isSafe(100)).toBe(true);
      expect(isSafe(204)).toBe(true);
      expect(isSafe(300)).toBe(false);
      expect(isSafe(404)).toBe(false);
    });
  });

  describe('getDefaultStatusCode', () => {
    it('returns correct default for each category', () => {
      expect(getDefaultStatusCode('info')).toBe(100);
      expect(getDefaultStatusCode('success')).toBe(200);
      expect(getDefaultStatusCode('redirect')).toBe(301);
      expect(getDefaultStatusCode('client')).toBe(400);
      expect(getDefaultStatusCode('server')).toBe(500);
    });
  });

  describe('assertValidStatusCode', () => {
    it('does not throw for valid codes', () => {
      expect(() => assertValidStatusCode(200)).not.toThrow();
      expect(() => assertValidStatusCode(404)).not.toThrow();
    });

    it('throws for invalid codes', () => {
      expect(() => assertValidStatusCode(99)).toThrow('Invalid HTTP status code: 99');
      expect(() => assertValidStatusCode(600)).toThrow('Invalid HTTP status code: 600');
    });
  });

  describe('getStatusDescription', () => {
    it('returns correct descriptions for known codes', () => {
      expect(getStatusDescription(200)).toBe('OK');
      expect(getStatusDescription(201)).toBe('Created');
      expect(getStatusDescription(404)).toBe('Not Found');
      expect(getStatusDescription(500)).toBe('Internal Server Error');
      expect(getStatusDescription(418)).toBe("I'm a teapot");
    });

    it('returns Unknown Status for unrecognized but valid codes', () => {
      // HTTP 103 is valid but might not be commonly described
      expect(getStatusDescription(103)).toBe('Early Hints');
    });
  });
});
