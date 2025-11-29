import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAuthorizationServerMetadata, getMetadataUrl } from './authorization-server-metadata'

// Mock undici module
vi.mock('undici', async () => {
  const actual = await vi.importActual('undici')
  return {
    ...actual,
    fetch: vi.fn(),
  }
})

import { fetch } from 'undici'

describe('authorization-server-metadata', () => {
  describe('getMetadataUrl', () => {
    it('should construct correct well-known URL', () => {
      const url = getMetadataUrl('https://example.com/mcp')
      expect(url).toBe('https://example.com/.well-known/oauth-authorization-server')
    })

    it('should handle URLs with different paths', () => {
      const url = getMetadataUrl('https://api.example.com/v1/mcp/server')
      expect(url).toBe('https://api.example.com/.well-known/oauth-authorization-server')
    })

    it('should handle URLs with ports', () => {
      const url = getMetadataUrl('https://localhost:8080/mcp')
      expect(url).toBe('https://localhost:8080/.well-known/oauth-authorization-server')
    })
  })

  describe('fetchAuthorizationServerMetadata', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should fetch and parse metadata successfully', async () => {
      const mockMetadata = {
        issuer: 'https://example.com',
        authorization_endpoint: 'https://example.com/oauth/authorize',
        token_endpoint: 'https://example.com/oauth/token',
        scopes_supported: ['openid', 'email', 'profile', 'custom:read'],
        response_types_supported: ['code'],
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetadata,
      } as any)

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toEqual(mockMetadata)
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/oauth-authorization-server',
        expect.objectContaining({
          headers: {
            Accept: 'application/json',
          },
        }),
      )
    })

    it('should return undefined on 404', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toBeUndefined()
    })

    it('should return undefined on other HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any)

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toBeUndefined()
    })

    it('should return undefined on network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toBeUndefined()
    })

    it('should handle timeout errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Timeout'))

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toBeUndefined()
    })

    it('should handle metadata without scopes_supported', async () => {
      const mockMetadata = {
        issuer: 'https://example.com',
        authorization_endpoint: 'https://example.com/oauth/authorize',
        token_endpoint: 'https://example.com/oauth/token',
        // No scopes_supported
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetadata,
      } as any)

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toEqual(mockMetadata)
      expect(metadata?.scopes_supported).toBeUndefined()
    })

    it('should handle metadata with empty scopes_supported', async () => {
      const mockMetadata = {
        issuer: 'https://example.com',
        scopes_supported: [],
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetadata,
      } as any)

      const metadata = await fetchAuthorizationServerMetadata('https://example.com/mcp')

      expect(metadata).toEqual(mockMetadata)
      expect(metadata?.scopes_supported).toEqual([])
    })
  })
})
