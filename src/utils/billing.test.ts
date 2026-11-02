import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateElectricityBill,
  calculateOccupancyRate,
  calculateCollectionRate,
  calculateInvoiceTotals,
} from './billing';

test('calculateElectricityBill correctly computes units and bill amount', () => {
  const result = calculateElectricityBill(5495, 5420, 8.0);
  assert.equal(result.isValid, true);
  assert.equal(result.units, 75);
  assert.equal(result.amount, 600);
});

test('calculateElectricityBill rejects current reading less than previous', () => {
  const result = calculateElectricityBill(5400, 5420, 8.0);
  assert.equal(result.isValid, false);
  assert.equal(result.units, 0);
  assert.equal(result.amount, 0);
});

test('calculateOccupancyRate accurately computes percentage', () => {
  const rate = calculateOccupancyRate(42, 48);
  assert.equal(rate, 87.5);

  const shantiRate = calculateOccupancyRate(16, 18);
  assert.equal(shantiRate, 88.9);
});

test('calculateCollectionRate computes collection percentage', () => {
  const rate = calculateCollectionRate(450000, 504000);
  assert.equal(rate, 89.3);
});

test('calculateInvoiceTotals calculates sum of rent and utilities', () => {
  const totals = calculateInvoiceTotals(12000, 960);
  assert.equal(totals.subtotal, 12960);
  assert.equal(totals.total, 12960);
});
