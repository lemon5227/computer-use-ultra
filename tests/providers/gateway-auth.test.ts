import { describe, expect, it } from 'vitest';
import { parseGatewayCredentialFile } from '../../src/providers/gateway-auth.js';

describe('parseGatewayCredentialFile', () => {
  it('accepts explicit quoted or unquoted gateway assignments', () => {
    expect(parseGatewayCredentialFile('export AI_GATEWAY_API_KEY="key-123"')).toEqual({
      variable: 'AI_GATEWAY_API_KEY',
      value: 'key-123',
    });
    expect(parseGatewayCredentialFile('VERCEL_OIDC_TOKEN=token_123')).toEqual({
      variable: 'VERCEL_OIDC_TOKEN',
      value: 'token_123',
    });
  });

  it('does not execute or accept shell expressions as credentials', () => {
    expect(parseGatewayCredentialFile('export AI_GATEWAY_API_KEY="$(security find-generic-password)"')).toBeUndefined();
    expect(parseGatewayCredentialFile('export AI_GATEWAY_API_KEY=$SECRET')).toBeUndefined();
  });
});
