/**
 * API Client Contract Tests
 *
 * Verifies that the request helper correctly handles all HTTP response types.
 * These use fetch mocking — no real server needed.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

const mockFetch = vi.fn();
let api: Awaited<typeof import('../api/client')>;

beforeAll(async () => {
  vi.stubGlobal('fetch', mockFetch);
  api = await import('../api/client');
});

beforeEach(() => {
  mockFetch.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('API client contracts', () => {
  describe('JSON responses (200)', () => {
    it('getSession parses JSON body', async () => {
      const data = { name: 'Test', players: {}, nextPlayerId: 0, groups: {}, nextGroupId: 0, tableCount: 15 };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const result = await api.getSession('ABC123', 'token');
      expect(result.name).toBe('Test');
    });

    it('createSession parses JSON response', async () => {
      const data = { code: 'XYZ789', hostToken: 'tok-123' };
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const result = await api.createSession({ name: 'Friday Night' });
      expect(result.code).toBe('XYZ789');
    });
  });

  describe('204 No Content responses', () => {
    it('deleteSession handles 204 without throwing', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await expect(
        api.deleteSession('ABC', 'token'),
      ).resolves.not.toThrow();
    });
  });

  describe('error responses', () => {
    it('404 throws with response body text', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Session not found', { status: 404 }));

      await expect(api.getSession('NOPE')).rejects.toThrow('Session not found');
    });

    it('500 throws with status code when body is empty', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 500 }));

      await expect(api.getSession('ABC')).rejects.toThrow('HTTP 500');
    });
  });

  describe('request headers', () => {
    it('getSession sends X-Host-Token when provided', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      await api.getSession('ABC', 'my-token');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Host-Token']).toBe('my-token');
    });

    it('getSession omits X-Host-Token when not provided', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      await api.getSession('ABC');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Host-Token']).toBeUndefined();
    });
  });
});
