# Local Development and Testing Guide

This guide explains how to build, test, and use your local version of `mcp-remote` for development.

## Quick Start

### 1. Build the Package

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 2. Link Locally (Option A - Recommended for Development)

Link your local version globally so you can test it:

```bash
# In the mcp-remote directory
npm link

# Now you can use it anywhere
mcp-remote https://example.com/mcp
```

To unlink later:

```bash
npm unlink -g mcp-remote
```

### 3. Use Directly with Node (Option B - Quick Testing)

Run the built files directly:

```bash
# Run the proxy
node dist/proxy.js https://example.com/mcp

# Run the client
node dist/client.js https://example.com/mcp
```

### 4. Use with npx from Local Directory (Option C - Test as End User)

```bash
# From the mcp-remote directory
npx . https://example.com/mcp
```

## Testing Your Changes

### Run Unit Tests

```bash
npm run test:unit
```

### Run Type Checking

```bash
npm run check
```

### Watch Mode for Development

```bash
# Auto-rebuild on file changes
npm run build:watch
```

## Testing TLS Client Certificate Feature

### 1. Create Test Certificates (for local testing)

```bash
# Create a test directory
mkdir -p ~/mcp-test-certs
cd ~/mcp-test-certs

# Generate CA key and certificate
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -days 365 -key ca-key.pem -out ca-cert.pem \
  -subj "/C=US/ST=Test/L=Test/O=Test/CN=Test CA"

# Generate server key and certificate
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server-csr.pem \
  -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"
openssl x509 -req -days 365 -in server-csr.pem -CA ca-cert.pem \
  -CAkey ca-key.pem -CAcreateserial -out server-cert.pem

# Generate client key and certificate
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client-csr.pem \
  -subj "/C=US/ST=Test/L=Test/O=Test/CN=Test Client"
openssl x509 -req -days 365 -in client-csr.pem -CA ca-cert.pem \
  -CAkey ca-key.pem -CAcreateserial -out client-cert.pem

# Set proper permissions
chmod 600 *-key.pem
```

### 2. Test with Local Certificates

```bash
# Using npm link
mcp-remote https://localhost:8443/mcp \
  --tls-cert ~/mcp-test-certs/client-cert.pem \
  --tls-key ~/mcp-test-certs/client-key.pem \
  --tls-ca ~/mcp-test-certs/ca-cert.pem \
  --allow-http \
  --debug

# Or using node directly
node dist/proxy.js https://localhost:8443/mcp \
  --tls-cert ~/mcp-test-certs/client-cert.pem \
  --tls-key ~/mcp-test-certs/client-key.pem \
  --tls-ca ~/mcp-test-certs/ca-cert.pem \
  --allow-http \
  --debug
```

### 3. Test with Encrypted Key

```bash
# Create encrypted key
openssl genrsa -aes256 -out client-key-encrypted.pem 2048
# (enter passphrase when prompted)

# Test with passphrase
mcp-remote https://localhost:8443/mcp \
  --tls-cert ~/mcp-test-certs/client-cert.pem \
  --tls-key ~/mcp-test-certs/client-key-encrypted.pem \
  --tls-passphrase "your-passphrase" \
  --tls-ca ~/mcp-test-certs/ca-cert.pem \
  --debug
```

## Using with Claude Desktop (Local Development)

### 1. Update Claude Desktop Config

Edit your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "local-dev-server": {
      "command": "node",
      "args": [
        "/media/jho/Data_500G/jho/projects/ibm/ai/mcp-remote/dist/proxy.js",
        "https://your-test-server.com/mcp",
        "--tls-cert",
        "/home/jho/mcp-test-certs/client-cert.pem",
        "--tls-key",
        "/home/jho/mcp-test-certs/client-key.pem",
        "--tls-ca",
        "/home/jho/mcp-test-certs/ca-cert.pem",
        "--debug"
      ]
    }
  }
}
```

### 2. Restart Claude Desktop

After updating the config, completely restart Claude Desktop to pick up the changes.

### 3. Check Logs

Monitor the logs to see if your changes are working:

```bash
# macOS/Linux
tail -f ~/Library/Logs/Claude/mcp*.log

# Check debug logs
tail -f ~/.mcp-auth/*_debug.log
```

## Development Workflow

### 1. Make Changes

Edit the TypeScript files in `src/`

### 2. Rebuild

```bash
npm run build
```

Or use watch mode:

```bash
npm run build:watch
```

### 3. Test

```bash
# Run unit tests
npm run test:unit

# Test manually
node dist/proxy.js https://example.com/mcp --debug
```

### 4. Format and Check

```bash
# Auto-fix formatting
npm run lint-fix

# Type check and format check
npm run check
```

## Debugging Tips

### Enable Debug Logging

Always use `--debug` flag during development:

```bash
mcp-remote https://example.com/mcp --debug
```

Debug logs are written to: `~/.mcp-auth/{server_hash}_debug.log`

### Clear Cached Credentials

If you're testing authentication changes:

```bash
rm -rf ~/.mcp-auth
```

### Check What's Being Executed

See exactly what command Claude Desktop is running:

```bash
# macOS/Linux
ps aux | grep mcp-remote

# Check environment
cat /proc/$(pgrep -f mcp-remote)/environ | tr '\0' '\n'
```

### Test TLS Connection Manually

Verify your certificates work with curl:

```bash
curl -v \
  --cert ~/mcp-test-certs/client-cert.pem \
  --key ~/mcp-test-certs/client-key.pem \
  --cacert ~/mcp-test-certs/ca-cert.pem \
  https://localhost:8443/mcp
```

## Publishing (When Ready)

### 1. Update Version

```bash
npm version patch  # or minor, or major
```

### 2. Build

```bash
npm run build
```

### 3. Test Package Locally

```bash
# Create a tarball
npm pack

# Test installing from tarball
npm install -g ./mcp-remote-0.1.31.tgz

# Test it works
mcp-remote --help
```

### 4. Publish to npm

```bash
npm publish
```

Or publish to your private registry:

```bash
npm publish --registry https://your-registry.com
```

## Common Issues

### "Module not found" errors

Make sure you've built the project:

```bash
npm run build
```

### Changes not reflected

If using `npm link`, you may need to rebuild:

```bash
npm run build
```

If using Claude Desktop, restart it completely.

### Certificate errors

Check file permissions:

```bash
ls -la ~/mcp-test-certs/
# Keys should be 600 (rw-------)
```

Verify certificate chain:

```bash
openssl verify -CAfile ~/mcp-test-certs/ca-cert.pem \
  ~/mcp-test-certs/client-cert.pem
```

### Port conflicts

If the default OAuth callback port is in use:

```bash
mcp-remote https://example.com/mcp 9999  # Use port 9999
```

## Environment Variables

Useful environment variables for development:

```bash
# Custom config directory
export MCP_REMOTE_CONFIG_DIR=~/my-test-config

# Node debugging
export NODE_OPTIONS="--inspect"

# Verbose npm
export npm_config_loglevel=verbose
```

## File Structure

```
mcp-remote/
├── src/              # TypeScript source files
│   ├── client.ts     # Client entry point
│   ├── proxy.ts      # Proxy entry point
│   └── lib/          # Library code
├── dist/             # Compiled JavaScript (generated)
├── docs/             # Documentation
├── package.json      # Package configuration
└── tsconfig.json     # TypeScript configuration
```

## Next Steps

1. Make your changes in `src/`
2. Build with `npm run build`
3. Test with `node dist/proxy.js` or `npm link`
4. Run tests with `npm run test:unit`
5. Format with `npm run lint-fix`
6. Commit and push your changes

Happy coding! 🚀
