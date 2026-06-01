import { describe, it, expect } from "vitest";
import { formatInvoiceNumber } from "./invoice";
import { nepaliFiscalYear, formatNPR, toBikramSambat } from "./nepal";

describe("formatInvoiceNumber", () => {
  it("zero-pads sequence to 4 digits", () => {
    expect(formatInvoiceNumber("NB", "2082-83", 7)).toBe("NB-2082-83-0007");
  });
  it("keeps large numbers", () => {
    expect(formatInvoiceNumber("LP", "2082-83", 12345)).toBe("LP-2082-83-12345");
  });
});

describe("nepaliFiscalYear", () => {
  it("August belongs to new FY", () => {
    expect(nepaliFiscalYear(new Date("2025-08-01"))).toBe("2082-83");
  });
  it("March belongs to previous FY", () => {
    expect(nepaliFiscalYear(new Date("2025-03-01"))).toBe("2081-82");
  });
});

describe("formatNPR", () => {
  it("formats with Rs prefix", () => {
    expect(formatNPR(1234.5)).toBe("Rs 1,234.50");
  });
});

describe("toBikramSambat", () => {
  it("returns a BS-labelled string", () => {
    expect(toBikramSambat(new Date("2025-01-01"))).toContain("BS");
  });
});
