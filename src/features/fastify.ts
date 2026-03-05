/**
 * HTTP Status Code Utilities
 * 
 * Type-safe HTTP status code validation and categorization
 * for Fastify-style route handlers and middleware.
 */

// Informational responses (100-199)
export const INFO_CODES = [100, 101, 102, 103] as const;

// Successful responses (200-299)
export const SUCCESS_CODES = [200, 201, 202, 203, 204, 205, 206, 207, 208, 226] as const;

// Redirection messages (300-399)
export const REDIRECT_CODES = [300, 301, 302, 303, 304, 305, 307, 308] as const;

// Client error responses (400-499)
export const CLIENT_ERROR_CODES = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409,
  410, 411, 412, 413, 414, 415, 416, 417, 418, 421,
  422, 423, 424, 425, 426, 428, 429, 431, 451
] as const;

// Server error responses (500-599)
export const SERVER_ERROR_CODES = [
  500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511
] as const;

// Combined type
type InfoCode = typeof INFO_CODES[number];
type SuccessCode = typeof SUCCESS_CODES[number];
type RedirectCode = typeof REDIRECT_CODES[number];
type ClientErrorCode = typeof CLIENT_ERROR_CODES[number];
type ServerErrorCode = typeof SERVER_ERROR_CODES[number];

export type HttpStatusCode = 
  | InfoCode 
  | SuccessCode 
  | RedirectCode 
  | ClientErrorCode 
  | ServerErrorCode;

/**
 * Check if a status code is valid (registered HTTP status code)
 */
export function isValidStatusCode(code: number): code is HttpStatusCode {
  return (
    code >= 100 && code < 600 &&
    (isInformational(code) ||
     isSuccess(code) ||
     isRedirect(code) ||
     isClientError(code) ||
     isServerError(code))
  );
}

/**
 * Check if status code is informational (100-199)
 */
export function isInformational(code: number): code is InfoCode {
  return code >= 100 && code < 200;
}

/**
 * Check if status code is successful (200-299)
 */
export function isSuccess(code: number): code is SuccessCode {
  return code >= 200 && code < 300;
}

/**
 * Check if status code is a redirect (300-399)
 */
export function isRedirect(code: number): code is RedirectCode {
  return code >= 300 && code < 400;
}

/**
 * Check if status code is a client error (400-499)
 */
export function isClientError(code: number): code is ClientErrorCode {
  return code >= 400 && code < 500;
}

/**
 * Check if status code is a server error (500-599)
 */
export function isServerError(code: number): code is ServerErrorCode {
  return code >= 500 && code < 600;
}

/**
 * Check if status code is an error (4xx or 5xx)
 */
export function isError(code: number): code is ClientErrorCode | ServerErrorCode {
  return isClientError(code) || isServerError(code);
}

/**
 * Check if status code is OK (200)
 */
export function isOk(code: number): boolean {
  return code === 200;
}

/**
 * Check if status code is "safe" (1xx or 2xx - request succeeded or is in progress)
 */
export function isSafe(code: number): boolean {
  return code < 300;
}

/**
 * Get default status code for a category
 */
export function getDefaultStatusCode(category: 'info' | 'success' | 'redirect' | 'client' | 'server'): HttpStatusCode {
  switch (category) {
    case 'info': return 100;
    case 'success': return 200;
    case 'redirect': return 301;
    case 'client': return 400;
    case 'server': return 500;
    default: return 500;
  }
}

/**
 * Assert that a code is a valid HTTP status code
 * Throws if invalid
 */
export function assertValidStatusCode(code: number): asserts code is HttpStatusCode {
  if (!isValidStatusCode(code)) {
    throw new Error(`Invalid HTTP status code: ${code}`);
  }
}

/**
 * Get human-readable description for status code
 */
export function getStatusDescription(code: HttpStatusCode): string {
  const descriptions: Record<HttpStatusCode, string> = {
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    103: 'Early Hints',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
  };
  
  return descriptions[code] || 'Unknown Status';
}
