/**
 * currency.test.js
 *
 * Unit tests for the currency precision utilities.
 * This is critically important — bugs here affect every transaction amount.
 */

const { rupeesToPaise, paiseToRupees, formatRupees } = require("../../src/utils/currency");

describe("rupeesToPaise", () => {
  it("converts whole rupees to paise", () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(1)).toBe(100);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it("converts decimal rupees to paise correctly", () => {
    expect(rupeesToPaise(100.50)).toBe(10050);
    expect(rupeesToPaise(1.99)).toBe(199);
    expect(rupeesToPaise(0.01)).toBe(1);
  });

  it("handles floating-point precision using Math.round (the whole point)", () => {
    // The classic JS gotcha: 0.1 + 0.2 = 0.30000000000000004 (not 0.3)
    // Without Math.round, 0.30000000000000004 * 100 = 30.000000000000004
    // Math.round makes this safe: we get exactly 30
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);

    // Another common float trap: 99.99 * 100 without rounding = 9998.999...
    // Math.round gives us the correct 9999
    expect(rupeesToPaise(99.99)).toBe(9999);
  });

  it("returns an integer (never a float)", () => {
    const result = rupeesToPaise(100.50);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("handles large amounts", () => {
    expect(rupeesToPaise(10000000)).toBe(1000000000); // ₹1 crore = 100 crore paise
  });
});

describe("paiseToRupees", () => {
  it("converts paise to rupees", () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(100)).toBe(1);
    expect(paiseToRupees(1)).toBe(0.01);
    expect(paiseToRupees(0)).toBe(0);
  });

  it("is the inverse of rupeesToPaise for standard amounts", () => {
    const amounts = [100, 100.5, 1.99, 999.99, 0.01];
    amounts.forEach((rupees) => {
      expect(paiseToRupees(rupeesToPaise(rupees))).toBeCloseTo(rupees, 10);
    });
  });

  it("converts 10050 paise to 100.5 rupees", () => {
    expect(paiseToRupees(10050)).toBe(100.5);
  });
});

describe("formatRupees", () => {
  it("formats paise as a rupee string with 2 decimal places", () => {
    expect(formatRupees(10000)).toBe("₹100.00");
    expect(formatRupees(10050)).toBe("₹100.50");
    expect(formatRupees(1)).toBe("₹0.01");
    expect(formatRupees(0)).toBe("₹0.00");
  });

  it("includes the rupee symbol", () => {
    expect(formatRupees(500)).toMatch(/^₹/);
  });

  it("always shows exactly 2 decimal places", () => {
    expect(formatRupees(10000)).toMatch(/\.\d{2}$/);
    expect(formatRupees(10050)).toMatch(/\.\d{2}$/);
  });
});
