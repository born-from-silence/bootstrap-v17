import type { ToolPlugin } from "../manager";

export interface PasswordResult {
  success: boolean;
  password?: string;
  length: number;
  options: {
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
  };
  strength?: "weak" | "fair" | "good" | "strong" | "excellent";
  error?: string;
}

// Character sets for password generation
const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

// Crypto-secure random integer
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0]! % max;
}

// Calculate password strength
function calculateStrength(password: string, options: PasswordResult["options"]): PasswordResult["strength"] {
  const charTypes = [
    options.includeUppercase,
    options.includeLowercase,
    options.includeNumbers,
    options.includeSymbols,
  ].filter(Boolean).length;

  const length = password.length;

  if (length < 8 || charTypes < 2) return "weak";
  if (length < 12 && charTypes < 3) return "fair";
  if (length >= 12 && charTypes >= 3) {
    if (length >= 20 && charTypes === 4) return "excellent";
    if (length >= 16) return "strong";
    return "good";
  }
  if (charTypes >= 3) return "good";
  return "fair";
}

export const passwordPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "generate_password",
      description: "Generate a secure, random password with customizable options.",
      parameters: {
        type: "object",
        properties: {
          length: {
            type: "number",
            description: "Length of the password. Default: 16. Range: 4-128.",
            default: 16,
            minimum: 4,
            maximum: 128,
          },
          include_uppercase: {
            type: "boolean",
            description: "Include uppercase letters (A-Z). Default: true.",
            default: true,
          },
          include_lowercase: {
            type: "boolean",
            description: "Include lowercase letters (a-z). Default: true.",
            default: true,
          },
          include_numbers: {
            type: "boolean",
            description: "Include numbers (0-9). Default: true.",
            default: true,
          },
          include_symbols: {
            type: "boolean",
            description: "Include symbols (!@#$%^&*...). Default: true.",
            default: true,
          },
        },
      },
    },
  },

  execute: (args: {
    length?: number;
    include_uppercase?: boolean;
    include_lowercase?: boolean;
    include_numbers?: boolean;
    include_symbols?: boolean;
  }): string => {
    // Set defaults
    const length = args.length ?? 16;
    const includeUppercase = args.include_uppercase ?? true;
    const includeLowercase = args.include_lowercase ?? true;
    const includeNumbers = args.include_numbers ?? true;
    const includeSymbols = args.include_symbols ?? true;

    // Build character pool
    let charPool = "";
    const options = {
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
    };

    if (includeUppercase) charPool += CHAR_SETS.uppercase;
    if (includeLowercase) charPool += CHAR_SETS.lowercase;
    if (includeNumbers) charPool += CHAR_SETS.numbers;
    if (includeSymbols) charPool += CHAR_SETS.symbols;

    // Validate at least one character set is selected
    if (charPool.length === 0) {
      return JSON.stringify({
        success: false,
        length,
        options,
        error: "At least one character set must be selected (uppercase, lowercase, numbers, or symbols).",
      } as PasswordResult);
    }

    // Validate password length
    if (length < 4 || length > 128) {
      return JSON.stringify({
        success: false,
        length,
        options,
        error: "Password length must be between 4 and 128 characters.",
      } as PasswordResult);
    }

    // Generate password
    let password = "";
    
    // Ensure at least one character from each selected set
    if (includeUppercase) password += CHAR_SETS.uppercase[secureRandomInt(CHAR_SETS.uppercase.length)];
    if (includeLowercase) password += CHAR_SETS.lowercase[secureRandomInt(CHAR_SETS.lowercase.length)];
    if (includeNumbers) password += CHAR_SETS.numbers[secureRandomInt(CHAR_SETS.numbers.length)];
    if (includeSymbols) password += CHAR_SETS.symbols[secureRandomInt(CHAR_SETS.symbols.length)];

    // Fill remaining length
    while (password.length < length) {
      password += charPool[secureRandomInt(charPool.length)];
    }

    // Shuffle the password to randomize positions of guaranteed characters
    const passwordArray = password.split("");
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [passwordArray[i], passwordArray[j]] = [passwordArray[j]!, passwordArray[i]!];
    }
    password = passwordArray.join("");

    // Calculate strength
    const strength = calculateStrength(password, options);

    return JSON.stringify({
      success: true,
      password,
      length,
      options,
      strength,
    } as PasswordResult);
  },
};
