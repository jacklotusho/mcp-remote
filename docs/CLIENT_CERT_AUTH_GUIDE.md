# Client Certificate Authentication Guide

This guide explains how to add custom client certificate authentication to the `node-oauth-client-provider.ts` component.

## Overview

The MCP Remote project uses the `undici` library for HTTP requests. To add client certificate authentication, you need to:

1. Add TLS certificate configuration options
2. Create a custom `undici` Agent with TLS settings
3. Pass the agent through the authentication flow
4. Update command-line argument parsing to accept certificate paths

## Implementation Steps

### Step 1: Add TLS Configuration Types

Add the following interface to `src/lib/types.ts`:

```typescript
/**
 * TLS/SSL client certificate configuration
 */
export interface TLSClientCertConfig {
  /** Path to client certificate file (PEM format) */
  cert?: string
  /** Path to client private key file (PEM format) */
  key?: string
  /** Path to CA certificate file (PEM format) for server verification */
  ca?: string
  /** Passphrase for the private key (if encrypted) */
  passphrase?: string
  /** If true, accept self-signed certificates (NOT recommended for production) */
  rejectUnauthorized?: boolean
}
```

Then update the `OAuthProviderOptions` interface to include:

```typescript
export interface OAuthProviderOptions {
  // ... existing fields ...

  /** TLS client certificate configuration */
  tlsClientCert?: TLSClientCertConfig
}
```

### Step 2: Update NodeOAuthClientProvider

Modify `src/lib/node-oauth-client-provider.ts` to store and use the TLS configuration:

```typescript
import { Agent } from 'undici'
import { readFileSync } from 'fs'

export class NodeOAuthClientProvider implements OAuthClientProvider {
  // ... existing fields ...
  private tlsClientCert: TLSClientCertConfig | undefined
  private customAgent: Agent | undefined

  constructor(readonly options: OAuthProviderOptions) {
    // ... existing initialization ...
    this.tlsClientCert = options.tlsClientCert

    // Create custom agent if TLS cert config is provided
    if (this.tlsClientCert) {
      this.customAgent = this.createTLSAgent()
    }
  }

  /**
   * Creates an undici Agent with TLS client certificate configuration
   */
  private createTLSAgent(): Agent {
    if (!this.tlsClientCert) {
      throw new Error('TLS client cert config is required')
    }

    const tlsOptions: any = {}

    // Load certificate files
    if (this.tlsClientCert.cert) {
      tlsOptions.cert = readFileSync(this.tlsClientCert.cert)
    }

    if (this.tlsClientCert.key) {
      tlsOptions.key = readFileSync(this.tlsClientCert.key)
    }

    if (this.tlsClientCert.ca) {
      tlsOptions.ca = readFileSync(this.tlsClientCert.ca)
    }

    if (this.tlsClientCert.passphrase) {
      tlsOptions.passphrase = this.tlsClientCert.passphrase
    }

    if (this.tlsClientCert.rejectUnauthorized !== undefined) {
      tlsOptions.rejectUnauthorized = this.tlsClientCert.rejectUnauthorized
    }

    return new Agent({
      connect: tlsOptions,
    })
  }

  /**
   * Gets the custom agent for HTTP requests
   */
  getCustomAgent(): Agent | undefined {
    return this.customAgent
  }
}
```

### Step 3: Update Utils to Use Custom Agent

Modify `src/lib/utils.ts` to accept and use a custom agent in the `connectToRemoteServer` function:

```typescript
export async function connectToRemoteServer(
  client: Client | null,
  serverUrl: string,
  authProvider: OAuthClientProvider,
  headers: Record<string, string>,
  authInitializer: AuthInitializer,
  transportStrategy: TransportStrategy = 'http-first',
  recursionReasons: Set<string> = new Set(),
  customAgent?: Agent, // Add this parameter
): Promise<Transport> {
  // ... existing code ...

  // Update the eventSourceInit to use custom agent
  const eventSourceInit = {
    fetch: (url: string | URL, init?: RequestInit) => {
      return Promise.resolve(authProvider?.tokens?.()).then((tokens) =>
        fetch(url, {
          ...init,
          dispatcher: customAgent, // Add custom agent here
          headers: {
            ...(init?.headers instanceof Headers
              ? Object.fromEntries(init?.headers.entries())
              : (init?.headers as Record<string, string>) || {}),
            ...headers,
            ...(tokens?.access_token ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
            Accept: 'text/event-stream',
          } as Record<string, string>,
        }),
      )
    },
  }

  // Also update the transport creation to use custom agent
  const transport = sseTransport
    ? new SSEClientTransport(url, {
        authProvider,
        requestInit: {
          headers,
          dispatcher: customAgent, // Add here too
        },
        eventSourceInit,
      })
    : new StreamableHTTPClientTransport(url, {
        authProvider,
        requestInit: {
          headers,
          dispatcher: customAgent, // And here
        },
      })

  // ... rest of the function ...
}
```

### Step 4: Update Authorization Server Metadata Fetching

Modify `src/lib/authorization-server-metadata.ts` to accept a custom agent:

```typescript
export async function fetchAuthorizationServerMetadata(
  serverUrl: string,
  customAgent?: Agent
): Promise<AuthorizationServerMetadata | undefined> {
  const metadataUrl = getMetadataUrl(serverUrl)

  debugLog('Fetching authorization server metadata', { serverUrl, metadataUrl })

  try {
    const response = await fetch(metadataUrl, {
      headers: {
        Accept: 'application/json',
      },
      dispatcher: customAgent, // Add custom agent
    })

    // ... rest of the function ...
  }
}
```

### Step 5: Add Command-Line Arguments

Update `src/lib/utils.ts` in the `parseCommandLineArgs` function to accept certificate paths:

```typescript
export async function parseCommandLineArgs(args: string[], usage: string) {
  // ... existing code ...

  // Parse TLS client certificate options
  let tlsClientCert: TLSClientCertConfig | undefined
  const certIndex = args.indexOf('--tls-cert')
  const keyIndex = args.indexOf('--tls-key')
  const caIndex = args.indexOf('--tls-ca')
  const passphraseIndex = args.indexOf('--tls-passphrase')
  const allowSelfSignedIndex = args.indexOf('--tls-allow-self-signed')

  if (certIndex !== -1 || keyIndex !== -1 || caIndex !== -1) {
    tlsClientCert = {}

    if (certIndex !== -1 && certIndex < args.length - 1) {
      tlsClientCert.cert = args[certIndex + 1]
      log(`Using TLS client certificate: ${tlsClientCert.cert}`)
    }

    if (keyIndex !== -1 && keyIndex < args.length - 1) {
      tlsClientCert.key = args[keyIndex + 1]
      log(`Using TLS client key: ${tlsClientCert.key}`)
    }

    if (caIndex !== -1 && caIndex < args.length - 1) {
      tlsClientCert.ca = args[caIndex + 1]
      log(`Using TLS CA certificate: ${tlsClientCert.ca}`)
    }

    if (passphraseIndex !== -1 && passphraseIndex < args.length - 1) {
      tlsClientCert.passphrase = args[passphraseIndex + 1]
      log('Using TLS key passphrase (hidden)')
    }

    if (allowSelfSignedIndex !== -1) {
      tlsClientCert.rejectUnauthorized = false
      log('WARNING: Accepting self-signed certificates (not recommended for production)')
    }
  }

  return {
    // ... existing return values ...
    tlsClientCert,
  }
}
```

### Step 6: Wire Everything Together in proxy.ts

Update `src/proxy.ts` to pass the TLS configuration through:

```typescript
async function runProxy(
  serverUrl: string,
  callbackPort: number,
  headers: Record<string, string>,
  transportStrategy: TransportStrategy = 'http-first',
  host: string,
  staticOAuthClientMetadata: StaticOAuthClientMetadata,
  staticOAuthClientInfo: StaticOAuthClientInformationFull,
  authorizeResource: string,
  ignoredTools: string[],
  authTimeoutMs: number,
  serverUrlHash: string,
  tlsClientCert?: TLSClientCertConfig, // Add this parameter
) {
  // ... existing code ...

  const authProvider = new NodeOAuthClientProvider({
    serverUrl,
    callbackPort,
    host,
    serverUrlHash,
    staticOAuthClientMetadata,
    staticOAuthClientInfo,
    authorizeResource,
    authorizationServerMetadata,
    tlsClientCert, // Pass it here
  })

  // Get custom agent from provider
  const customAgent = authProvider.getCustomAgent?.()

  // ... existing code ...

  // Pass custom agent to connectToRemoteServer
  const transport = await connectToRemoteServer(
    null,
    serverUrl,
    authProvider,
    headers,
    authInitializer,
    transportStrategy,
    new Set(),
    customAgent, // Pass it here
  )

  // ... rest of the function ...
}
```

## Usage Examples

### Command Line

```bash
# Basic client certificate authentication
npx mcp-remote https://example.com/mcp \
  --tls-cert /path/to/client-cert.pem \
  --tls-key /path/to/client-key.pem \
  --tls-ca /path/to/ca-cert.pem

# With encrypted private key
npx mcp-remote https://example.com/mcp \
  --tls-cert /path/to/client-cert.pem \
  --tls-key /path/to/client-key.pem \
  --tls-passphrase "my-secret-passphrase"

# Allow self-signed certificates (development only)
npx mcp-remote https://example.com/mcp \
  --tls-cert /path/to/client-cert.pem \
  --tls-key /path/to/client-key.pem \
  --tls-allow-self-signed
```

### Verifying Connection

To verify your certificates are working correctly before configuring your MCP client (like Claude Desktop), use the `mcp-remote-client` tool:

```bash
# Verify connection and list tools
npx mcp-remote-client https://example.com/mcp \
  --tls-cert /path/to/client-cert.pem \
  --tls-key /path/to/client-key.pem \
  --tls-ca /path/to/ca-cert.pem \
  --debug
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "my-secure-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://example.com/mcp",
        "--tls-cert",
        "/path/to/client-cert.pem",
        "--tls-key",
        "/path/to/client-key.pem",
        "--tls-ca",
        "/path/to/ca-cert.pem"
      ]
    }
  }
}
```

### Programmatic Usage

```typescript
import { NodeOAuthClientProvider } from './lib/node-oauth-client-provider'

const authProvider = new NodeOAuthClientProvider({
  serverUrl: 'https://example.com/mcp',
  callbackPort: 3000,
  host: 'localhost',
  serverUrlHash: 'abc123',
  tlsClientCert: {
    cert: '/path/to/client-cert.pem',
    key: '/path/to/client-key.pem',
    ca: '/path/to/ca-cert.pem',
    passphrase: 'optional-passphrase',
    rejectUnauthorized: true, // Default: true
  },
})

const customAgent = authProvider.getCustomAgent()
// Use customAgent in your HTTP requests
```

## Certificate Format Requirements

- **Certificate files** must be in PEM format
- **Private key** can be encrypted (PKCS#8) or unencrypted
- **CA certificate** should contain the full certificate chain if needed

## Security Considerations

1. **Never commit certificates** to version control
2. **Use environment variables** for sensitive paths in production
3. **Set `rejectUnauthorized: true`** in production (default behavior)
4. **Protect private key files** with appropriate file permissions (chmod 600)
5. **Use encrypted private keys** when possible and store passphrases securely

## Troubleshooting

### Common Issues

1. **"unable to get local issuer certificate"**

   - Solution: Provide the CA certificate using `--tls-ca`

2. **"certificate signature failure"**

   - Solution: Ensure the certificate matches the private key

3. **"bad decrypt"**

   - Solution: Check the passphrase for encrypted keys

4. **"self signed certificate"**
   - Solution: Add `--tls-allow-self-signed` (development only) or provide proper CA

### Debug Mode

Enable debug logging to see TLS-related errors:

```bash
npx mcp-remote https://example.com/mcp \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem \
  --debug
```

Check the debug log at `~/.mcp-auth/<server-hash>_debug.log`

## References

- [Undici Agent Documentation](https://undici.nodejs.org/#/docs/api/Agent)
- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)
- [OAuth 2.0 Mutual-TLS Client Authentication](https://datatracker.ietf.org/doc/html/rfc8705)
