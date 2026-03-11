type CommandValidation = {
  command: string;
  allowed: boolean;
  reason?: string;
};

type ValidatorRule = {
  name: string;
  pattern: RegExp;
  message: string;
};

/**
 * CommandValidator - Security-focused command validation
 * 
 * Validates shell commands against a set of security rules to prevent:
 * - Privilege escalation
 * - Recursive deletion of system directories  
 * - Disk destruction operations
 * - Command injection via backticks and $()
 * - Data exfiltration via piping to network tools
 * - Direct device access
 * - Permission tampering on system directories
 */
export class CommandValidator {
  private rules: ValidatorRule[] = [
    // PRIORITY 1: Most dangerous - privilege escalation
    {
      name: "forbidden_sudo",
      pattern: /\bsudo\b/i,
      message: "Forbidden: sudo escalation",
    },
    // PRIORITY 2: Fork bombs - bash function definition
    {
      name: "forbidden_fork_bomb",
      pattern: /:\s*\(\s*\)\s*:?\s*\{/,
      message: "Forbidden: potential fork bomb detected",
    },
    // PRIORITY 3: Dangerous command substitution
    {
      name: "forbidden_dangerous_backticks",
      pattern: /`[^`]*\brm\b[^`]*`/,
      message: "Forbidden: dangerous command substitution with rm",
    },
    {
      name: "forbidden_dollar_paren_etc",
      pattern: /\$\([^)]*\/etc\/[^)]*\)/,
      message: "Forbidden: dangerous command substitution with system paths",
    },
    // PRIORITY 4: User switch
    {
      name: "forbidden_su",
      pattern: /\bsu\s+[-c]/,
      message: "Forbidden: user switch",
    },
    // PRIORITY 5: System path deletion
    {
      name: "forbidden_system_deletion",
      pattern: /\brm\s+(?:-[a-zA-Z]+\s+)?\/(?:etc|usr|bin|sbin|dev|proc|sys|root)(?:\/|$|\s)/,
      message: "Forbidden: deletion targeting system paths",
    },
    // PRIORITY 6: Recursive deletion targeting root
    {
      name: "forbidden_recursive_delete",
      pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+\/\s*(?:\||&|$|;)/,
      message: "Forbidden: recursive deletion targeting root",
    },
    // PRIORITY 7: Disk destruction commands
    {
      name: "forbidden_dd_to_disk",
      pattern: /\bdd\s+.*of=\s*\/dev\//i,
      message: "Forbidden: direct disk write via dd",
    },
    {
      name: "forbidden_mkfs",
      pattern: /\bmkfs\./i,
      message: "Forbidden: filesystem creation",
    },
    {
      name: "forbidden_format",
      pattern: /\bformat\s+/i,
      message: "Forbidden: format command",
    },
    // PRIORITY 8: Data exfiltration patterns
    {
      name: "forbidden_pipe_to_wget",
      pattern: /\|\s*.*\bwget\b/i,
      message: "Forbidden: piping to wget",
    },
    // PRIORITY 9: Raw device access
    {
      name: "forbidden_device_redirect",
      pattern: /[<>,&]\s*\/dev\/\w+/i,
      message: "Forbidden: direct device access",
    },
    // PRIORITY 10: System integrity - permission changes
    {
      name: "forbidden_chmod_system",
      pattern: /\bchmod\s+.*\/+(etc|usr|bin|sbin)\//i,
      message: "Forbidden: changing permissions on system directories",
    },
    {
      name: "forbidden_chown_system",
      pattern: /\bchown\s+.*\/+(etc|usr|bin|sbin)\//i,
      message: "Forbidden: changing ownership on system directories",
    },
    // PRIORITY 11: Privilege escalation via symlinks
    {
      name: "forbidden_symlink_root",
      pattern: /\bln\s+[-fs].*\/root/i,
      message: "Forbidden: symlink to root",
    },
    // PRIORITY 12: Payload obfuscation
    {
      name: "forbidden_base64_decode",
      pattern: /\bbase64\s+(?:-d|--decode)\b/i,
      message: "Forbidden: base64 decoding detected",
    },
    // PRIORITY 13: Virtual filesystem execution
    {
      name: "forbidden_exec_device",
      pattern: /\bexec\s+.*\/dev\//i,
      message: "Forbidden: executing from /dev",
    },
    {
      name: "forbidden_exec_proc",
      pattern: /\bexec\s+.*\/proc\//i,
      message: "Forbidden: executing from /proc",
    },
  ];

  /**
   * Validate a command against all security rules
   */
  validate(command: string): CommandValidation {
    const trimmed = command.trim();
    
    if (!trimmed) {
      return {
        command: trimmed,
        allowed: false,
        reason: "Empty command rejected",
      };
    }

    for (const rule of this.rules) {
      if (rule.pattern.test(trimmed)) {
        return {
          command: trimmed,
          allowed: false,
          reason: rule.message,
        };
      }
    }

    return {
      command: trimmed,
      allowed: true,
    };
  }

  /**
   * Add a custom validation rule
   */
  addRule(rule: ValidatorRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all configured rules
   */
  getRules(): ValidatorRule[] {
    return [...this.rules];
  }

  /**
   * Check if command is allowed (convenience method)
   */
  isAllowed(command: string): boolean {
    return this.validate(command).allowed;
  }
}

// Export types for consumers
export type { CommandValidation, ValidatorRule };

// Default singleton instance
export const defaultValidator = new CommandValidator();
