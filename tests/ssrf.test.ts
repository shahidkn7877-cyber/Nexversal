import { describe, it, expect } from 'vitest';
import { isSafeExternalUrl } from '../src/lib/security/ssrf';

describe('SSRF Protection (isSafeExternalUrl)', () => {
  it('allows valid external HTTPS URLs', () => {
    const result = isSafeExternalUrl('https://example.com/blog/article');
    expect(result.safe).toBe(true);
    expect(result.parsedUrl?.hostname).toBe('example.com');
  });

  it('allows valid external HTTP URLs', () => {
    const result = isSafeExternalUrl('http://example.org');
    expect(result.safe).toBe(true);
  });

  it('blocks localhost', () => {
    const result = isSafeExternalUrl('http://localhost:3000');
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('blocks 127.0.0.1 loopback', () => {
    const result = isSafeExternalUrl('http://127.0.0.1:8080/admin');
    expect(result.safe).toBe(false);
  });

  it('blocks 10.x.x.x private network IP', () => {
    const result = isSafeExternalUrl('http://10.0.0.1/status');
    expect(result.safe).toBe(false);
  });

  it('blocks 172.16.x.x private network IP', () => {
    const result = isSafeExternalUrl('http://172.16.0.5/api');
    expect(result.safe).toBe(false);
  });

  it('blocks 192.168.x.x private network IP', () => {
    const result = isSafeExternalUrl('http://192.168.1.1/router');
    expect(result.safe).toBe(false);
  });

  it('blocks AWS/GCP cloud metadata IP 169.254.169.254', () => {
    const result = isSafeExternalUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.safe).toBe(false);
  });

  it('blocks internal domain suffixes (.local, .internal)', () => {
    const result = isSafeExternalUrl('https://server.internal/dashboard');
    expect(result.safe).toBe(false);
  });

  it('blocks non-http protocols like file:// and ftp://', () => {
    expect(isSafeExternalUrl('file:///etc/passwd').safe).toBe(false);
    expect(isSafeExternalUrl('ftp://ftp.example.com').safe).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)').safe).toBe(false);
  });
});
