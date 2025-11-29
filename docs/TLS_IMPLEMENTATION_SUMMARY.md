# TLS Client Certificate Authentication - Implementation Summary

## Overview

Successfully implemented TLS client certificate authentication support for the MCP Remote OAuth client provider. This allows users to connect to servers that require mutual TLS (mTLS) authentication.

## Changes Made

### 1. Type Definitions (`src/lib/types.ts`)

- Added `TLSClientCertConfig` interface with fields for:
  - `cert`: Path to client certificate (PEM format)
  - `key`: Path to private key (PEM format)
  - `ca`: Path to CA certificate (PEM format)
  - `passphrase`: Optional passphrase for encrypted keys
  - `rejectUnauthorized`: Flag to control certificate verification
- Updated `OAuthProviderOptions` to include optional `tlsClientCert` field

### 2. OAuth Client Provider (`src/lib/node-oauth-client-provider.ts`)

- Added imports for `Agent` from undici and `readFileSync` from fs
- Added private fields `tlsClientCert` and `customAgent` to the class
- Implemented `createTLSAgent()` method that:
  - Reads certificate files from disk
  - Configures undici Agent with TLS options
  - Handles passphrases for encrypted keys
  - Logs certificate loading for debugging
- Implemented `getCustomAgent()` method to expose the custom agent
- Updated constructor to create custom agent when TLS config is provided
- Updated `getAuthorizationServerMetadata()` to pass custom agent to fetch calls

### 3. Authorization Server Metadata (`src/lib/authorization-server-metadata.ts`)

- Updated to import `fetch` from undici instead of using global fetch
- Added `customAgent` parameter to `fetchAuthorizationServerMetadata()`
- Updated fetch call to use `dispatcher: customAgent` option

### 4. Utilities (`src/lib/utils.ts`)

- Added `customAgent` parameter to `connectToRemoteServer()` function
- Updated `eventSourceInit` to include `dispatcher: customAgent`
- Updated transport creation for both SSE and HTTP to use custom agent
- Updated recursive calls to pass customAgent through
- Added TLS certificate command-line argument parsing:
  - `--tls-cert`: Path to client certificate
  - `--tls-key`: Path to private key
  - `--tls-ca`: Path to CA certificate
  - `--tls-passphrase`: Passphrase for encrypted key
  - `--tls-allow-self-signed`: Accept self-signed certificates
- Added `tlsClientCert` to return object of `parseCommandLineArgs()`

### 5. Proxy (`src/proxy.ts`)

- Added `tlsClientCert` parameter to `runProxy()` function
- Reordered initialization to create auth provider first (to get custom agent)
- Updated `fetchAuthorizationServerMetadata()` call to use custom agent
- Updated `connectToRemoteServer()` call to pass custom agent
- Updated command-line argument destructuring to include `tlsClientCert`
- Passed `tlsClientCert` through to `runProxy()` call

### 6. Tests (`src/lib/authorization-server-metadata.test.ts`)

- Fixed tests to mock undici's fetch instead of global fetch
- Updated all test cases to use `vi.mocked(fetch)` pattern
- All tests passing ✅

### 7. Documentation

- Created comprehensive guide: `docs/CLIENT_CERT_AUTH_GUIDE.md`
- Updated `README.md` with TLS client certificate section
- Included usage examples for:
  - Basic client certificate authentication
  - Encrypted private keys with passphrases
  - Self-signed certificate acceptance (development)
  - Claude Desktop configuration examples

## Usage Examples

### Command Line

```bash
npx mcp-remote https://secure.server.com/mcp \
  --tls-cert /path/to/client-cert.pem \
  --tls-key /path/to/client-key.pem \
  --tls-ca /path/to/ca-cert.pem
```

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "secure-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://secure.server.com/mcp",
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

### With Encrypted Key

```json
{
  "mcpServers": {
    "secure-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://secure.server.com/mcp",
        "--tls-cert",
        "/path/to/client-cert.pem",
        "--tls-key",
        "/path/to/client-key.pem",
        "--tls-passphrase",
        "${TLS_PASSPHRASE}"
      ],
      "env": {
        "TLS_PASSPHRASE": "your-secret-passphrase"
      }
    }
  }
}
```

## Security Considerations

1. **Certificate Format**: All certificates must be in PEM format
2. **File Permissions**: Private keys should be protected (chmod 600)
3. **No Version Control**: Never commit certificates to git
4. **Production Settings**: Always use `rejectUnauthorized: true` (default)
5. **Encrypted Keys**: Use encrypted private keys when possible
6. **Environment Variables**: Store passphrases in environment variables

## Testing

- ✅ All unit tests passing (76 tests)
- ✅ TypeScript compilation successful
- ✅ Code formatting validated
- ✅ Build successful

## Files Modified

1. `src/lib/types.ts` - Added TLS configuration types
2. `src/lib/node-oauth-client-provider.ts` - Implemented TLS agent creation
3. `src/lib/authorization-server-metadata.ts` - Updated to use custom agent
4. `src/lib/utils.ts` - Added CLI parsing and agent propagation
5. `src/proxy.ts` - Wired everything together
6. `src/client.ts` - Updated to support TLS arguments (Fixed issue where CLI client ignored TLS flags)
7. `src/lib/authorization-server-metadata.test.ts` - Fixed tests
8. `docs/CLIENT_CERT_AUTH_GUIDE.md` - Created comprehensive guide
9. `README.md` - Added user documentation

## Implementation Notes

## Implementation Summary

### Key Changes

1. **`src/lib/utils.ts`**:
   - Imported `fetch` from `undici` as `undiciFetch` to avoid conflicts with global fetch
   - Updated `customFetch` function to use `undiciFetch` with the TLS agent
   - Updated `eventSourceInit.fetch` to use `undiciFetch` with the TLS agent
   - Fixed `StreamableHTTPClientTransport` SSE connection by passing custom `fetch` function

2. **`src/client.ts`**:
   - Fixed event handler chaining to prevent overwriting SDK's internal handlers
   - This ensures the Client can receive and process server responses

3. **`src/proxy.ts`**:
   - Added global `fetch` override when TLS client certificates are provided
   - This workaround is necessary because the SDK's `StreamableHTTPClientTransport` doesn't properly use the custom fetch option for all requests
   - The override ensures all fetch calls use `undici`'s fetch with the TLS agent

4. **`package.json`**:
   - Added `undici` to the `external` array in tsup config to ensure the package version is used at runtime instead of being bundled

### Why the Global Fetch Override is Needed

The `@modelcontextprotocol/sdk`'s `StreamableHTTPClientTransport` has a limitation where it doesn't consistently use the custom `fetch` function passed to its constructor. While it accepts a `fetch` option, the SDK sometimes falls back to the global `fetch` for certain requests (particularly the initial connection request in the `send()` method).

Node's global `fetch` (based on an older internal version of `undici`) doesn't properly support client certificates via the `dispatcher` option in the same way the `undici` package does. By overriding the global `fetch` with `undici`'s fetch configured with our TLS agent, we ensure all requests use the correct TLS configuration.

This is a workaround until the SDK properly supports custom fetch functions for all requests.

npm install -g pnpm
pnpm install
pnpm build
pnpm run dev

npx tsx src/client.ts http://localhost:7070/ticket/mcp --debug \
 --header "Content-Type: application/json" \
 --header "Accept: application/json, text/event-stream" \
 --header "Authorization: Bearer <BEARER_TOKEN>"

npx tsx src/client.ts https://localhost:8090/zpdt/mcp --debug \
 --header "Content-Type: application/json" \
 --header "Accept: application/json, text/event-stream" \
--tls-cert "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.crt" \
--tls-key "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.key" \
--tls-ca "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/ca.crt"

npx mcp-remote-client https://localhost:8090/zpdt/mcp --debug \
 --header "Content-Type: application/json" \
 --header "Accept: application/json, text/event-stream" \
--tls-cert "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.crt" \
--tls-key "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.key" \
--tls-ca "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/ca.crt"

npx mcp-remote https://localhost:8090/zpdt/mcp --debug \
 --header "Content-Type: application/json" \
 --header "Accept: application/json, text/event-stream" \
--tls-cert "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.crt" \
--tls-key "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/client.key" \
--tls-ca "/media/jho/Data_500G/jho/projects/ibm/md_resources/linux/cert/crt_key/ca.crt"
