/**
 * Billing and statistics utilities for KirayaSaathi
 */

export function calculateElectricityBill(
  currentReading: number,
  previousReading: number,
  ratePerKwh: number
): { units: number; amount: number; isValid: boolean } {
  if (currentReading < previousReading || isNaN(currentReading) || isNaN(previousReading)) {
    return { units: 0, amount: 0, isValid: false };
  }
  const units = currentReading - previousReading;
  const amount = Math.round(units * ratePerKwh);
  return { units, amount, isValid: true };
}

export function calculateOccupancyRate(occupiedRooms: number, totalRooms: number): number {
  if (totalRooms <= 0) return 0;
  return Number(((occupiedRooms / totalRooms) * 100).toFixed(1));
}

export function calculateCollectionRate(collected: number, expected: number): number {
  if (expected <= 0) return 0;
  return Number(((collected / expected) * 100).toFixed(1));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', '₹');
}

export function calculateInvoiceTotals(rent: number, electricity: number): {
  subtotal: number;
  total: number;
} {
  const subtotal = (Number(rent) || 0) + (Number(electricity) || 0);
  return {
    subtotal,
    total: subtotal,
  };
}
