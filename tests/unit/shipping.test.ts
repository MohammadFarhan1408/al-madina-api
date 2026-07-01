import { computeShipping } from '../../src/modules/orders/orders.service';
import {
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
  EXPRESS_DELIVERY_FEE,
} from '../../src/constants/business';

describe('computeShipping (§7 Shipping)', () => {
  it('is free for an empty cart', () => {
    expect(computeShipping(0, 'standard')).toBe(0);
  });

  it('charges the flat fee below the free-shipping threshold', () => {
    expect(computeShipping(FREE_SHIPPING_THRESHOLD - 1, 'standard')).toBe(FLAT_SHIPPING_FEE);
    expect(computeShipping(100, 'standard')).toBe(20);
  });

  it('is free at or above the threshold', () => {
    expect(computeShipping(FREE_SHIPPING_THRESHOLD, 'standard')).toBe(0);
    expect(computeShipping(500, 'standard')).toBe(0);
  });

  it('adds the express fee on top of base shipping', () => {
    // Below threshold + express = flat + express
    expect(computeShipping(100, 'express')).toBe(FLAT_SHIPPING_FEE + EXPRESS_DELIVERY_FEE);
    // At/above threshold + express = express only
    expect(computeShipping(300, 'express')).toBe(EXPRESS_DELIVERY_FEE);
  });
});
