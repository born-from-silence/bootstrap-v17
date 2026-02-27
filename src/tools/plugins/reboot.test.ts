import { describe, test, expect } from "vitest";
import { rebootPlugin } from "./reboot";

describe("rebootPlugin", () => {
  test("should return REBOOTING signal", async () => {
    const result = await rebootPlugin.execute({});
    expect(result).toBe("REBOOTING");
  });
});
