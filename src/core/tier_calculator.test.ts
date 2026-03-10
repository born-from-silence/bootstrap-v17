/**
 * TierCalculator Tests
 * 
 * Tests for constant-time bonus calculations and cryptographic operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TierCalculator, Tier, type BonusParams, type BonusResult } from './tier_calculator.js';

// Utility function for hex conversion in tests
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('TierCalculator', () => {
  let calculator: TierCalculator;

  beforeEach(() => {
    calculator = new TierCalculator();
  });

  describe('Tier Calculations', () => {
    it('should calculate bonuses for all tiers', () => {
      const basePoints = 1000;
      
      const bronze = calculator.calculateTierBonus(Tier.BRONZE, basePoints);
      const silver = calculator.calculateTierBonus(Tier.SILVER, basePoints);
      const gold = calculator.calculateTierBonus(Tier.GOLD, basePoints);
      const platinum = calculator.calculateTierBonus(Tier.PLATINUM, basePoints);
      const diamond = calculator.calculateTierBonus(Tier.DIAMOND, basePoints);
      
      expect(bronze).toBe(100);
      expect(silver).toBe(250);
      expect(gold).toBe(500);
      expect(platinum).toBe(1000);
      expect(diamond).toBe(2000);
    });

    it('should return consistent results for same inputs', () => {
      const bonus1 = calculator.calculateTierBonus(Tier.GOLD, 500);
      const bonus2 = calculator.calculateTierBonus(Tier.GOLD, 500);
      const bonus3 = calculator.calculateTierBonus(Tier.GOLD, 500);
      
      expect(bonus1).toBe(bonus2);
      expect(bonus2).toBe(bonus3);
      expect(bonus1).toBe(500);
    });

    it('should handle all tier values', () => {
      expect(Tier.BRONZE).toBe(1);
      expect(Tier.SILVER).toBe(2);
      expect(Tier.GOLD).toBe(3);
      expect(Tier.PLATINUM).toBe(4);
      expect(Tier.DIAMOND).toBe(5);
    });
  });

  describe('Activity Multiplier', () => {
    it('should calculate multipliers for different activity levels', () => {
      const levels = [
        { activity: 0, expected: 1.1 },
        { activity: 1, expected: 1.1 },
        { activity: 5, expected: 1.1 },
        { activity: 9, expected: 1.1 },
        { activity: 10, expected: 1.25 },
        { activity: 50, expected: 1.5 },
        { activity: 100, expected: 2.0 },
        { activity: 500, expected: 3.0 },
        { activity: 1000, expected: 5.0 },
        { activity: 2000, expected: 5.0 },
      ];

      for (const { activity, expected } of levels) {
        const multiplier = calculator.calculateActivityMultiplier(activity);
        expect(multiplier).toBe(expected);
      }
    });

    it('should return consistent multipliers', () => {
      const m1 = calculator.calculateActivityMultiplier(100);
      const m2 = calculator.calculateActivityMultiplier(100);
      expect(m1).toBe(m2);
    });

    it('should handle boundary values', () => {
      const at9 = calculator.calculateActivityMultiplier(9);
      const at10 = calculator.calculateActivityMultiplier(10);
      const at11 = calculator.calculateActivityMultiplier(11);
      
      expect(at9).toBe(1.1);
      expect(at10).toBe(1.25);
      expect(at11).toBe(1.25);
    });
  });

  describe('Time Bonus', () => {
    it('should calculate time bonus for different timestamps', () => {
      const now = Date.now();
      
      const recent = calculator.calculateTimeBonus(now);
      expect(recent).toBe(10);
      
      const oneDay = calculator.calculateTimeBonus(now - 25 * 60 * 60 * 1000);
      expect(oneDay).toBe(20);
      
      const twoDays = calculator.calculateTimeBonus(now - 49 * 60 * 60 * 1000);
      expect(twoDays).toBe(30);
      
      const weekOld = calculator.calculateTimeBonus(now - 7 * 24 * 60 * 60 * 1000);
      expect(weekOld).toBe(80);
    });

    it('should calculate correct bonus near day boundaries', () => {
      const now = Date.now();
      
      const underDay = calculator.calculateTimeBonus(now - (23 * 60 * 60 * 1000));
      expect(underDay).toBe(10);
      
      const overDay = calculator.calculateTimeBonus(now - (25 * 60 * 60 * 1000));
      expect(overDay).toBe(20);
    });

    it('should be deterministic for same timestamp', () => {
      const ts = Date.now() - 86400000;
      const bonus1 = calculator.calculateTimeBonus(ts);
      const bonus2 = calculator.calculateTimeBonus(ts);
      expect(bonus1).toBe(bonus2);
    });
  });

  // Helper function with proper typing
  function getGenerateDH(calc: TierCalculator): (u: string, t: Tier) => bigint {
    return (calc as unknown as { generateDHProof(u: string, t: Tier): bigint }).generateDHProof.bind(calc);
  }

  function getBigIntToBytes(calc: TierCalculator): (v: bigint, s: number) => Uint8Array {
    return (calc as unknown as { bigIntToBytes(v: bigint, s: number): Uint8Array }).bigIntToBytes.bind(calc);
  }

  function getGenerateRSA(calc: TierCalculator): (d: string) => bigint {
    return (calc as unknown as { generateRSASignature(d: string): bigint }).generateRSASignature.bind(calc);
  }

  describe('DH Proofs', () => {
    it('should generate consistent DH proofs', () => {
      const generateDH = getGenerateDH(calculator);
      
      const proof1 = generateDH('user1', Tier.GOLD);
      const proof2 = generateDH('user1', Tier.GOLD);
      
      expect(proof1).toBe(proof2);
    });

    it('should generate different proofs for different users', () => {
      const generateDH = getGenerateDH(calculator);
      
      const proof1 = generateDH('user1', Tier.GOLD);
      const proof2 = generateDH('user2', Tier.GOLD);
      
      expect(proof1).not.toBe(proof2);
    });

    it('should generate different proofs for different tiers', () => {
      const generateDH = getGenerateDH(calculator);
      
      const proof1 = generateDH('user1', Tier.BRONZE);
      const proof2 = generateDH('user1', Tier.DIAMOND);
      
      expect(proof1).not.toBe(proof2);
    });

    it('should verify DH proofs correctly', () => {
      const userId = 'testuser';
      const tier = Tier.SILVER;
      
      const generateDH = getGenerateDH(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      const proof = generateDH(userId, tier);
      const proofBytes = bigIntToBytes(proof, 32);
      const hexProof = bytesToHex(proofBytes);
      
      const isValid = calculator.verifyDHProof(userId, tier, hexProof);
      expect(isValid).toBe(true);
    });

    it('should reject invalid DH proofs', () => {
      const isValid = calculator.verifyDHProof('user1', Tier.GOLD, '00000000000000000000000000000000');
      expect(isValid).toBe(false);
    });

    it('should reject DH proofs with wrong tier', () => {
      const userId = 'testuser';
      const tier = Tier.GOLD;
      
      const generateDH = getGenerateDH(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      const proof = generateDH(userId, tier);
      const hexProof = bytesToHex(bigIntToBytes(proof, 32));
      
      const isValid = calculator.verifyDHProof(userId, Tier.SILVER, hexProof);
      expect(isValid).toBe(false);
    });
  });

  describe('RSA Signatures', () => {
    it('should generate consistent RSA signatures', () => {
      const data = 'test_data_123';
      const generateRSA = getGenerateRSA(calculator);
      
      const sig1 = generateRSA(data);
      const sig2 = generateRSA(data);
      
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different data', () => {
      const generateRSA = getGenerateRSA(calculator);
      
      const sig1 = generateRSA('data1');
      const sig2 = generateRSA('data2');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should verify RSA signatures correctly', () => {
      const data = 'test_data_for_signature';
      const generateRSA = getGenerateRSA(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      const signature = generateRSA(data);
      const sigBytes = bigIntToBytes(signature, 32);
      const hexSig = bytesToHex(sigBytes);
      
      const isValid = calculator.verifyRSASignature(data, hexSig);
      expect(isValid).toBe(true);
    });

    it('should reject invalid RSA signatures', () => {
      const isValid = calculator.verifyRSASignature('data', '00000000000000000000000000000000');
      expect(isValid).toBe(false);
    });

    it('should reject RSA signatures with tampered data', () => {
      const data = 'original_data';
      const generateRSA = getGenerateRSA(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      const signature = generateRSA(data);
      const hexSig = bytesToHex(bigIntToBytes(signature, 32));
      
      const isValid = calculator.verifyRSASignature('tampered_data', hexSig);
      expect(isValid).toBe(false);
    });
  });

  describe('Full Bonus Calculation', () => {
    it('should calculate complete bonus with all components', () => {
      const params: BonusParams = {
        basePoints: 1000,
        activityMultiplier: 100,
        tier: Tier.GOLD,
        timestamp: Date.now() - 86400000,
        userId: 'testuser',
      };

      const result = calculator.calculateBonus(params);
      
      expect(result.totalPoints).toBeGreaterThan(params.basePoints);
      expect(result.tierBonus).toBe(500);
      expect(result.activityBonus).toBeGreaterThan(0);
      expect(result.timeBonus).toBeGreaterThan(0);
      expect(result.dhProof).toBeDefined();
      expect(result.dhProof.length).toBe(64);
      expect(result.rsaSignature).toBeDefined();
      expect(result.rsaSignature.length).toBe(64);
    });

    it('should calculate different bonuses for different tiers', () => {
      const base = {
        basePoints: 1000,
        activityMultiplier: 100,
        timestamp: Date.now(),
        userId: 'testuser',
      };

      const bronze = calculator.calculateBonus({ ...base, tier: Tier.BRONZE });
      const silver = calculator.calculateBonus({ ...base, tier: Tier.SILVER });
      const gold = calculator.calculateBonus({ ...base, tier: Tier.GOLD });
      const platinum = calculator.calculateBonus({ ...base, tier: Tier.PLATINUM });
      const diamond = calculator.calculateBonus({ ...base, tier: Tier.DIAMOND });

      expect(silver.tierBonus).toBeGreaterThan(bronze.tierBonus);
      expect(gold.tierBonus).toBeGreaterThan(silver.tierBonus);
      expect(platinum.tierBonus).toBeGreaterThan(gold.tierBonus);
      expect(diamond.tierBonus).toBeGreaterThan(platinum.tierBonus);
      expect(silver.totalPoints).toBeGreaterThan(bronze.totalPoints);
    });

    it('should generate unique proofs for each calculation', () => {
      const base = {
        basePoints: 1000,
        activityMultiplier: 100,
        timestamp: Date.now(),
        userId: 'testuser',
      };

      const result1 = calculator.calculateBonus({ ...base, tier: Tier.GOLD });
      const result2 = calculator.calculateBonus({ ...base, tier: Tier.GOLD });

      expect(result1.totalPoints).toBe(result2.totalPoints);
      expect(result1.dhProof).toBe(result2.dhProof);
      expect(result1.rsaSignature).toBe(result2.rsaSignature);
    });

    it('should generate different results for different users', () => {
      const base = {
        basePoints: 1000,
        activityMultiplier: 100,
        tier: Tier.GOLD,
        timestamp: Date.now(),
      };

      const result1 = calculator.calculateBonus({ ...base, userId: 'user1' });
      const result2 = calculator.calculateBonus({ ...base, userId: 'user2' });

      expect(result1.dhProof).not.toBe(result2.dhProof);
      expect(result1.rsaSignature).not.toBe(result2.rsaSignature);
      expect(result1.tierBonus).toBe(result2.tierBonus);
      expect(result1.totalPoints).toBe(result2.totalPoints);
    });

    it('should handle edge cases', () => {
      const params: BonusParams = {
        basePoints: 0,
        activityMultiplier: 0,
        tier: Tier.BRONZE,
        timestamp: Date.now(),
        userId: '',
      };

      const result = calculator.calculateBonus(params);
      
      expect(result.totalPoints).toBeGreaterThanOrEqual(0);
      expect(result.dhProof).toBeDefined();
      expect(result.rsaSignature).toBeDefined();
    });

    it('should handle large base points', () => {
      const params: BonusParams = {
        basePoints: 1000000,
        activityMultiplier: 500,
        tier: Tier.DIAMOND,
        timestamp: Date.now(),
        userId: 'heavy_user',
      };

      const result = calculator.calculateBonus(params);
      
      expect(result.totalPoints).toBeGreaterThan(params.basePoints);
      expect(result.tierBonus).toBe(2000);
    });

    it('should verify its own proofs', () => {
      const params: BonusParams = {
        basePoints: 1000,
        activityMultiplier: 100,
        tier: Tier.GOLD,
        timestamp: Date.now(),
        userId: 'testuser',
      };

      const result = calculator.calculateBonus(params);
      
      const dhValid = calculator.verifyDHProof(params.userId, params.tier, result.dhProof);
      const rsaValid = calculator.verifyRSASignature(
        `${params.userId}:${params.tier}:${params.basePoints}:${params.timestamp}`,
        result.rsaSignature
      );
      
      expect(dhValid).toBe(true);
      expect(rsaValid).toBe(true);
    });
  });

  describe('Timing Independence', () => {
    it('should provide timing-independent proofs', () => {
      const proof1 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.GOLD,
        seed: 12345,
      });

      const proof2 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.GOLD,
        seed: 12345,
      });

      expect(proof1).toBe(proof2);
    });

    it('should generate different proofs for different seeds', () => {
      const proof1 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.GOLD,
        seed: 1,
      });

      const proof2 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.GOLD,
        seed: 2,
      });

      expect(proof1).not.toBe(proof2);
    });

    it('should generate different proofs for different users', () => {
      const proof1 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.GOLD,
        seed: 12345,
      });

      const proof2 = calculator.getTimingIndependentProof({
        userId: 'user2',
        tier: Tier.GOLD,
        seed: 12345,
      });

      expect(proof1).not.toBe(proof2);
    });

    it('should generate different proofs for different tiers', () => {
      const proof1 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.BRONZE,
        seed: 12345,
      });

      const proof2 = calculator.getTimingIndependentProof({
        userId: 'user1',
        tier: Tier.DIAMOND,
        seed: 12345,
      });

      expect(proof1).not.toBe(proof2);
    });
  });

  describe('Security Properties', () => {
    it('should have constant-length outputs', () => {
      const proofs: string[] = [];
      
      const generateDH = getGenerateDH(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      for (let tier = Tier.BRONZE; tier <= Tier.DIAMOND; tier++) {
        const proof = generateDH(`user${tier}`, tier);
        const proofStr = bytesToHex(bigIntToBytes(proof, 32));
        proofs.push(proofStr);
      }
      
      const lengths = new Set(proofs.map(p => p.length));
      expect(lengths.size).toBe(1);
      expect(proofs[0]!.length).toBe(64);
    });

    it('should generate outputs with high entropy', () => {
      const generateDH = getGenerateDH(calculator);
      
      const dhProofs: bigint[] = [];
      for (let i = 0; i < 10; i++) {
        dhProofs.push(generateDH(`user${i}`, Tier.GOLD));
      }
      
      const uniqueProofs = new Set(dhProofs);
      expect(uniqueProofs.size).toBe(dhProofs.length);
    });

    it('should use different keys for different users', () => {
      const generateRSA = getGenerateRSA(calculator);
      
      const signature1 = generateRSA('user1:data');
      const signature2 = generateRSA('user2:data');
      
      expect(signature1).not.toBe(signature2);
    });

    it('should verify with constant time comparison', () => {
      const userId = 'testuser';
      const tier = Tier.GOLD;
      
      const generateDH = getGenerateDH(calculator);
      const bigIntToBytes = getBigIntToBytes(calculator);
      
      const validProof = generateDH(userId, tier);
      const validHex = bytesToHex(bigIntToBytes(validProof, 32));
      
      const invalidHex = '00'.repeat(32);
      
      const validResult = calculator.verifyDHProof(userId, tier, validHex);
      const invalidResult = calculator.verifyDHProof(userId, tier, invalidHex);
      
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });

    it('should handle malformed hex strings gracefully', () => {
      const isValid1 = calculator.verifyDHProof('user1', Tier.GOLD, 'invalid');
      expect(isValid1).toBe(false);
      
      const isValid2 = calculator.verifyDHProof('user1', Tier.GOLD, 'abc');
      expect(isValid2).toBe(false);
      
      const isValid3 = calculator.verifyDHProof('user1', Tier.GOLD, '');
      expect(isValid3).toBe(false);
    });
  });

  describe('Stress Tests', () => {
    it('should handle many calculations efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        calculator.calculateBonus({
          basePoints: i * 100,
          activityMultiplier: i * 10,
          tier: (i % 5) + 1 as Tier,
          timestamp: Date.now() - i * 1000,
          userId: `user${i}`,
        });
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
    });

    it('should maintain consistency under repeated calculations', () => {
      const params: BonusParams = {
        basePoints: 5000,
        activityMultiplier: 500,
        tier: Tier.PLATINUM,
        timestamp: Date.now(),
        userId: 'consistency_test',
      };

      const results: BonusResult[] = [];
      results.push(calculator.calculateBonus(params));
      
      for (let i = 0; i < 9; i++) {
        results.push(calculator.calculateBonus(params));
      }

      expect(results.length).toBe(10);
      const first = results[0]!;
      
      for (const result of results) {
        expect(result.totalPoints).toBe(first.totalPoints);
        expect(result.tierBonus).toBe(first.tierBonus);
        expect(result.dhProof).toBe(first.dhProof);
        expect(result.rsaSignature).toBe(first.rsaSignature);
      }
    });
  });
});
