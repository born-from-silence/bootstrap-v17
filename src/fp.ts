/**
 * File Processor (fp.ts)
 * 
 * File type detection and analysis utilities for Nexus.
 * Identifies text vs binary files, detects encodings, and analyzes projects.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

export interface FileAnalysis {
  totalFiles: number;
  textFiles: number;
  binaryFiles: number;
  utf8Files: number;
  utf16Files: number;
  extensions: Map<string, number>;
}

// Text file extensions whitelist
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.ts', '.js', '.json', '.yaml', '.yml',
  '.html', '.css', '.xml', '.csv', '.log', '.sh', '.bash',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.hpp', '.cs', '.php', '.pl', '.swift', '.kt', '.scala',
  '.r', '.m', '.mm', '.sql', '.graphql', '.dockerfile',
  '.gitignore', '.editorconfig', '.env', '.ini', '.cfg',
  '.conf', '.properties', '.toml', '.lock'
]);

// Binary file extensions blacklist
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.wav', '.ogg', '.flac', '.aac', '.wma', '.zip', '.tar',
  '.gz', '.bz2', '.7z', '.rar', '.exe', '.dll', '.so',
  '.dylib', '.bin', '.dat', '.db', '.sqlite', '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.otf', '.ttf', '.woff', '.woff2', '.eot'
]);

/**
 * Check if a buffer contains primarily text content
 * Uses heuristics: printable char ratio + space detection
 */
const is_text = (buffer: Buffer): boolean => {
  if (buffer.length === 0) return true; // Empty files are text
  
  // Check for null bytes (binary indicator)
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    if (buffer[i] === 0x00) return false;
  }
  
  let textChars = 0;
  let asciiSpaceCount = 0;
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i] ?? 0;
    
    // Printable ASCII range (32-126)
    if (byte >= 32 && byte <= 126) {
      textChars++;
      if (byte === 0x20) asciiSpaceCount++; // Space character
    }
    // Common control characters (tab, newline, carriage return)
    else if (byte === 0x09 || byte === 0x0A || byte === 0x0D) {
      textChars++;
    }
  }
  
  // Primary test: >90% printable characters
  if (textChars > 0 && (textChars / buffer.length) > 0.9) {
    return true;
  }
  
  // Secondary: Space heuristic for ASCII text (logs, CSVs)
  // FIXED: Using textChars (was textBytes in buggy version)
  if (textChars > 0 && (asciiSpaceCount / textChars) > 0.05) {
    return true;
  }
  
  return false;
};

/**
 * Detect if buffer is UTF-16 without BOM
 * by looking for null byte patterns
 */
const isLikelyUtf16 = (buffer: Buffer): boolean => {
  // Count null bytes in even and odd positions
  let evenNulls = 0;
  let oddNulls = 0;
  const sampleSize = Math.min(buffer.length, 1024);
  
  for (let i = 0; i < sampleSize; i += 2) {
    if (buffer[i] === 0x00) evenNulls++;
    if (i + 1 < buffer.length && buffer[i + 1] === 0x00) oddNulls++;
  }
  
  const pairs = Math.floor(sampleSize / 2);
  // If we have significant null bytes in one position, likely UTF-16
  const hasManyEvenNulls = evenNulls > pairs * 0.3;
  const hasManyOddNulls = oddNulls > pairs * 0.3;
  
  return hasManyEvenNulls || hasManyOddNulls;
};

/**
 * Detect file content type
 */
export const detectFileContent = async (filePath: string): Promise<'utf-8' | 'utf-16' | 'binary' | 'empty'> => {
  try {
    const fileStat = await stat(filePath);
    
    if (fileStat.size === 0) return 'empty';
    
    const buffer = await readFile(filePath);
    
    // Check for UTF-16 BOM (do this before extension checks)
    if (buffer.length >= 2) {
      const b0 = buffer[0] ?? 0;
    const b1 = buffer[1] ?? 0;
    const bom = (b0 << 8) | b1;
      if (bom === 0xFEFF || bom === 0xFFFE) {
        return 'utf-16';
      }
    }
    
    // Check extension-based heuristics (for files without BOM)
    const ext = extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return 'binary';
    
    // Only check for UTF-16 if there's a null byte pattern
    if (isLikelyUtf16(buffer)) {
      try {
        const utf16Decoder = new TextDecoder('utf-16le', { fatal: true });
        utf16Decoder.decode(buffer);
        return 'utf-16';
      } catch {
        // Not valid UTF-16LE, try BE
        try {
          const utf16Decoder = new TextDecoder('utf-16be', { fatal: true });
          utf16Decoder.decode(buffer);
          return 'utf-16';
        } catch {
          // Not valid UTF-16 either, continue to text check
        }
      }
    }
    
    // Check if text file
    const isTextFile = is_text(buffer);
    if (isTextFile) {
      return 'utf-8';
    }
    
    // If it has a text extension but failed text detection, trust the extension
    if (TEXT_EXTENSIONS.has(ext)) {
      return 'utf-8';
    }
    
    return 'binary';
  } catch {
    return 'binary';
  }
};

/**
 * Analyze a project directory
 */
export const analyzeProject = async (rootPath: string): Promise<FileAnalysis> => {
  const analysis: FileAnalysis = {
    totalFiles: 0,
    textFiles: 0,
    binaryFiles: 0,
    utf8Files: 0,
    utf16Files: 0,
    extensions: new Map()
  };
  
  const analyzeFile = async (filePath: string): Promise<void> => {
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) return;
      
      analysis.totalFiles++;
      
      // Track extension
      const ext = extname(filePath).toLowerCase() || '(no ext)';
      analysis.extensions.set(ext, (analysis.extensions.get(ext) || 0) + 1);
      
      // Detect content type
      const contentType = await detectFileContent(filePath);
      
      switch (contentType) {
        case 'utf-8':
        case 'empty':
          analysis.textFiles++;
          analysis.utf8Files++;
          break;
        case 'utf-16':
          analysis.textFiles++;
          analysis.utf16Files++;
          break;
        case 'binary':
          analysis.binaryFiles++;
          break;
      }
    } catch {
      // Skip files we can't read
    }
  };
  
  const walkDirectory = async (dirPath: string): Promise<void> => {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // Skip common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === '__pycache__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          await analyzeFile(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  };
  
  await walkDirectory(rootPath);
  return analysis;
};

export default {
  is_text,
  detectFileContent,
  analyzeProject
};
