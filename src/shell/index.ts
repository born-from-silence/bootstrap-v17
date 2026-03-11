/**
 * Shell Module - Command validation and security
 * 
 * Provides security-focused command validation to prevent:
 * - Privilege escalation
 * - Data destruction
 * - Command injection
 * - Data exfiltration
 */

export { CommandValidator, defaultValidator } from "./command/validator";
export type { CommandValidation, ValidatorRule } from "./command/validator";
