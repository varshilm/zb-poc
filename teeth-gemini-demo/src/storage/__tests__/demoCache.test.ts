import {
  DEMO_CACHE_TTL_MS,
  createCacheEnvelope,
  isCacheEnvelopeExpired,
} from '../demoCache';

describe('demoCache helpers', () => {
  it('creates envelopes with a 24h TTL', () => {
    const now = 1_700_000_000_000;
    const envelope = createCacheEnvelope({ maskDataUrl: 'data:image/png;base64,abc' }, now);

    expect(envelope.savedAt).toBe(now);
    expect(envelope.expiresAt).toBe(now + DEMO_CACHE_TTL_MS);
    expect(DEMO_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('treats envelopes as expired at or after expiresAt', () => {
    const now = 1_700_000_000_000;
    const envelope = createCacheEnvelope({ ok: true }, now);

    expect(isCacheEnvelopeExpired(envelope, now)).toBe(false);
    expect(isCacheEnvelopeExpired(envelope, envelope.expiresAt - 1)).toBe(false);
    expect(isCacheEnvelopeExpired(envelope, envelope.expiresAt)).toBe(true);
    expect(isCacheEnvelopeExpired(envelope, envelope.expiresAt + 1)).toBe(true);
  });
});
