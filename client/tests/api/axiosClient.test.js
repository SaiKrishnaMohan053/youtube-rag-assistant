import { describe, it, expect, beforeEach } from 'vitest';
import axiosClient from '../../src/api/axiosClient';

describe('axiosClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('token', 'test-token');

    const config = {
      headers: {},
    };

    const interceptor = axiosClient.interceptors.request.handlers[0].fulfilled;
    const result = await interceptor(config);

    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not add Authorization header when token is missing', async () => {
    const config = {
      headers: {},
    };

    const interceptor = axiosClient.interceptors.request.handlers[0].fulfilled;
    const result = await interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
});