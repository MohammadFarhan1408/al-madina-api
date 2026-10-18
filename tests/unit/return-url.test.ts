import { returnUrlSchema } from '../../src/modules/payments/payments.schema';

describe('returnUrlSchema', () => {
  it('accepts allow-listed app schemes', () => {
    expect(returnUrlSchema.safeParse('almadinaittar://payment-return').success).toBe(true);
    expect(returnUrlSchema.safeParse('exp://192.168.1.5:8081/--/payment-return').success).toBe(true);
  });
  it('rejects web URLs and garbage (no open redirect)', () => {
    expect(returnUrlSchema.safeParse('https://evil.example.com').success).toBe(false);
    expect(returnUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(returnUrlSchema.safeParse('not a url').success).toBe(false);
  });
});
