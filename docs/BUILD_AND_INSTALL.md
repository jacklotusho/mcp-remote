# Build and Install Guide

## Prerequisites

- Node.js v18+
- pnpm (recommended) or npm

## Building Locally

1. **Install dependencies:**
   ```bash
   npm install -g pnpm
   pnpm install
   ```

2. **Build the project:**
   ```bash
   pnpm build
   ```
   This compiles the TypeScript source code into the `dist/` directory.

## Running the Client

You can run the client in two ways:

### 1. From Source (Development)
Use `tsx` to run the TypeScript file directly:
```bash
npx tsx src/client.ts <server-url> [options]
```

### 2. From Build (Production/Verification)
Run the compiled JavaScript file:
```bash
node dist/client.js <server-url> [options]
```
Or use the binary alias if installed:
```bash
npx mcp-remote-client <server-url> [options]
```

## Running the Proxy

The proxy is the main component used by MCP clients like Claude Desktop.

### 1. From Source
```bash
npx tsx src/proxy.ts <server-url> [options]
```

### 2. From Build
```bash
node dist/proxy.js <server-url> [options]
```
Or:
```bash
npx mcp-remote <server-url> [options]
```

## TLS Configuration

See [CLIENT_CERT_AUTH_GUIDE.md](./CLIENT_CERT_AUTH_GUIDE.md) for detailed instructions on using client certificates.
