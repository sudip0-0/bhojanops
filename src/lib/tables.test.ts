import { describe, it, expect } from "vitest";
import { isValidTableTransition } from "./tables";

describe("isValidTableTransition", () => {
  it("AVAILABLE -> OCCUPIED allowed", () => expect(isValidTableTransition("AVAILABLE", "OCCUPIED")).toBe(true));
  it("CLEANING -> OCCUPIED disallowed", () => expect(isValidTableTransition("CLEANING", "OCCUPIED")).toBe(false));
  it("DISABLED -> AVAILABLE allowed", () => expect(isValidTableTransition("DISABLED", "AVAILABLE")).toBe(true));
  it("AVAILABLE -> DISABLED allowed", () => expect(isValidTableTransition("AVAILABLE", "DISABLED")).toBe(true));
});
