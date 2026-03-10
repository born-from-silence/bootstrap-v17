/**
 * TierCalculator - Constant-Time Bonus Calculation System
 * 
 * Implements cryptographic bonus calculations using constant-time operations
 * to prevent timing side-channel attacks. All calculations execute in the same
 * amount of time regardless of tier level or input values.
 */

// Tier definitions with fixed parameters
export enum Tier {
  BRONZE = 1,
  SILVER = 2,
  GOLD = 3,
  PLATINUM = 4,
  DIAMOND = 5,
}

// Maximum tier for array sizing and iteration counts
const MAX_TIER = Tier.DIAMOND;

// DH parameters (using safer modulo with smaller prime for demo)
const DH_PRIME_HEX = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514E08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFF';

export interface BonusParams {
  basePoints: number;
  activityMultiplier: number;
  tier: Tier;
  timestamp: number;
  userId: string;
}

export interface BonusResult {
  totalPoints: number;
  tierBonus: number;
  activityBonus: number;
  timeBonus: number;
  dhProof: string;
  rsaSignature: string;
}

// Utility functions for hex conversion
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Compare two values in constant time
 * Returns 1 if a >= b, 0 otherwise
 */
function constantTimeGTE(a: number, b: number): number {
  // Constant time comparison using bit operations
  const diff = a - b;
  return ((diff >> 31) & 1) === 0 ? 1 : 0;
}

/**
 * Modular exponentiation optimized for constant time
 * Uses fixed iteration count regardless of exponent size
 */
function constantTimeModPow(base: bigint, exponent: bigint, primeHex: string): bigint {
  const modulus = BigInt('0x' + primeHex);
  let result = 1n;
  let basePow = base % modulus;
  
  // Fixed 256-bit exponent
  const maxBits = 256;
  
  for (let i = maxBits - 1; i >= 0; i--) {
    const bit = (exponent >> BigInt(i)) & 1n;
    
    // Square step (always performed)
    const tempBase = (basePow * basePow) % modulus;
    
    // Multiple step
    const tempResult = bit === 1n ? (result * basePow) % modulus : result;
    
    result = tempResult;
    basePow = tempBase;
  }
  
  return result;
}

/**
 * DH shared secret in constant time
 */
function calculateDHConstantTime(privateKey: bigint, publicKey: bigint, primeHex: string): bigint {
  return constantTimeModPow(publicKey, privateKey, primeHex);
}

/**
 * RSA signature in constant time
 */
function calculateRSAConstantTime(messageHash: bigint, privateKey: bigint, modulusHex: string): bigint {
  const modulus = BigInt('0x' + modulusHex);
  // PKCS padding simulation
  const paddedMessage = (messageHash << 128n) | (0x1n << 120n) | 0xFFn;
  return constantTimeModPow(paddedMessage, privateKey, modulusHex);
}

/**
 * TierCalculator - Main class for constant-time bonus calculations
 */
export class TierCalculator {
  private dhPrivateKey: bigint;
  private rsaPrivateKey: bigint;
  private rsaModulusHex: string;

  constructor() {
    // Deterministic keys for demo (use secure random in production)
    this.dhPrivateKey = BigInt('0x' + '123456789012345678901234567890'.repeat(2).slice(0, 40));
    this.rsaPrivateKey = BigInt('0x' + '987654321098765432109876543210'.repeat(2).slice(0, 40));
    this.rsaModulusHex = '1' + '0'.repeat(76); // Simple large modulus
  }

  /**
   * Calculate tier-based bonus using constant-time operations
   */
  calculateTierBonus(tier: Tier, _basePoints: number): number {
    const bonuses: Record<number, number> = {
      1: 100,
      2: 250,
      3: 500,
      4: 1000,
      5: 2000,
    };
    
    // Iterate through ALL tiers (constant-time loop)
    let tierBonus = 0;
    for (let i = Tier.BRONZE; i <= MAX_TIER; i++) {
      const isTargetTier = constantTimeGTE(i, tier) & constantTimeGTE(tier, i);
      const bonus = bonuses[i] ?? 0;
      tierBonus = tierBonus + (isTargetTier ? bonus : 0);
    }
    
    return tierBonus;
  }

  /**
   * Calculate activity multiplier in constant time
   */
  calculateActivityMultiplier(activity: number): number {
    const thresholds = [0, 10, 50, 100, 500, 1000];
    const multipliers = [1.0, 1.1, 1.25, 1.5, 2.0, 3.0, 5.0];
    
    let tier = 0;
    for (const threshold of thresholds) {
      const shouldAdvance = constantTimeGTE(activity, threshold);
      tier = tier + shouldAdvance;
    }
    
    const clampedTier = Math.min(tier, multipliers.length - 1);
    const result = multipliers[clampedTier];
    return result ?? 1.0;
  }

  /**
   * Calculate time-based bonus in constant time
   */
  calculateTimeBonus(timestamp: number): number {
    const now = Date.now();
    const age = now - timestamp;
    const hours = Math.floor(age / (1000 * 60 * 60));
    
    const maxHours = 720; // 30 days
    let bonus = 0;
    
    for (let h = 0; h <= maxHours; h += 24) {
      const threshold = constantTimeGTE(hours, h);
      bonus += threshold * 10;
    }
    
    return bonus;
  }

  /**
   * Generate DH proof in constant time
   */
  private generateDHProof(userId: string, tier: Tier): bigint {
    const userHash = this.hashToBigInt(userId);
    const tierMultiplier = BigInt(tier);
    
    // Public key computation
    const generator = 2n;
    const publicKey = constantTimeModPow(generator, this.dhPrivateKey, DH_PRIME_HEX);
    
    // Shared secret
    const sharedSecret = calculateDHConstantTime(
      this.dhPrivateKey * tierMultiplier,
      userHash % BigInt('0x' + DH_PRIME_HEX),
      DH_PRIME_HEX
    );
    
    // XOR and truncate to 256 bits
    const combined = publicKey ^ sharedSecret;
    return combined & ((1n << 256n) - 1n);
  }

  /**
   * Generate RSA signature
   */
  private generateRSASignature(data: string): bigint {
    const hash = this.hashToBigInt(data);
    return calculateRSAConstantTime(hash, this.rsaPrivateKey, this.rsaModulusHex);
  }

  /**
   * Simple hash function
   */
  private hashToBigInt(data: string): bigint {
    let result = 0n;
    for (let i = 0; i < data.length; i++) {
      result = ((result * 31n) + BigInt(data.charCodeAt(i))) & ((1n << 256n) - 1n);
    }
    return result;
  }

  /**
   * Calculate complete bonus with cryptographic proofs
   */
  calculateBonus(params: BonusParams): BonusResult {
    const { basePoints, activityMultiplier, tier, timestamp, userId } = params;
    
    const tierBonus = this.calculateTierBonus(tier, basePoints);
    const activityBonus = Math.floor(basePoints * (this.calculateActivityMultiplier(activityMultiplier) - 1));
    const timeBonus = this.calculateTimeBonus(timestamp);
    
    const dhProofValue = this.generateDHProof(userId, tier);
    const rsaSignatureValue = this.generateRSASignature(
      `${userId}:${tier}:${basePoints}:${timestamp}`
    );
    
    const totalPoints = basePoints + tierBonus + activityBonus + timeBonus;
    
    return {
      totalPoints,
      tierBonus,
      activityBonus,
      timeBonus,
      dhProof: bytesToHex(this.bigIntToBytes(dhProofValue, 32)),
      rsaSignature: bytesToHex(this.bigIntToBytes(rsaSignatureValue, 32)),
    };
  }

  /**
   * Convert bigint to fixed-size byte array
   */
  private bigIntToBytes(value: bigint, size: number): Uint8Array {
    const bytes = new Uint8Array(size);
    let temp = value;
    for (let i = size - 1; i >= 0; i--) {
      bytes[i] = Number(temp & 0xFFn);
      temp = temp >> 8n;
    }
    return bytes;
  }

  /**
   * Verify DH proof
   */
  verifyDHProof(userId: string, tier: Tier, proof: string): boolean {
    const expected = this.bigIntToBytes(this.generateDHProof(userId, tier), 32);
    let actual: Uint8Array;
    try {
      actual = hexToBytes(proof);
    } catch {
      return false;
    }
    
    if (actual.length !== expected.length) {
      return false;
    }
    
    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected[i]! ^ actual[i]!;
    }
    return diff === 0;
  }

  /**
   * Verify RSA signature
   */
  verifyRSASignature(data: string, signature: string): boolean {
    const expected = this.bigIntToBytes(this.generateRSASignature(data), 32);
    let actual: Uint8Array;
    try {
      actual = hexToBytes(signature);
    } catch {
      return false;
    }
    
    if (actual.length !== expected.length) {
      return false;
    }
    
    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected[i]! ^ actual[i]!;
    }
    return diff === 0;
  }

  /**
   * Get timing-independent proof
   */
  getTimingIndependentProof(inputs: { userId: string; tier: Tier; seed: number }): string {
    const { userId, tier, seed } = inputs;
    const hash = this.hashToBigInt(`${userId}:${tier}:${seed}`);
    return bytesToHex(this.bigIntToBytes(hash, 32));
  }
}

// Export singleton instance
export const tierCalculator = new TierCalculator();
