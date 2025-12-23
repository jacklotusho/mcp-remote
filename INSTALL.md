# Installation Guide

This guide covers how to install `mcp-remote` globally on your machine to make the `mcp-remote` and `mcp-remote-client` commands available system-wide.

## Prerequisites

- Node.js v18+
- npm or pnpm package manager

## Installation Methods

### Option 1: Install from npm (Published Package)

If the package is published to npm:
```bash
npm install -g mcp-remote
```

Or with pnpm:
```bash
pnpm add -g mcp-remote
```

### Option 2: Install from Local Build (Development)

**Recommended for local development.** This allows you to make changes and have them available globally after rebuilding.

1. **Clone and build the project:**
   ```bash
   git clone https://github.com/geelen/mcp-remote.git
   cd mcp-remote
   pnpm install
   pnpm build
   ```

2. **Link it globally:**
   
   Using npm (recommended):
   ```bash
   npm link
   ```
   
   Or using pnpm (requires `pnpm setup` to be run first):
   ```bash
   pnpm link --global
   ```
   
   > **Note:** If you get `ERR_PNPM_NO_GLOBAL_BIN_DIR` error with pnpm, either run `pnpm setup` first or use `npm link` instead.

After linking, the binaries will be available globally:
- `mcp-remote` - runs the proxy
- `mcp-remote-client` - runs the client

### Option 3: Install from GitHub

If the package is on GitHub but not published to npm:
```bash
npm install -g git+https://github.com/geelen/mcp-remote.git
```

## Verifying Installation

After installation, verify the binaries are available:
```bash
which mcp-remote
which mcp-remote-client
```

Both commands should return paths to the installed binaries. To test actual usage, you need to provide a server URL:
```bash
mcp-remote https://your-server-url
```

## Uninstalling

To remove the global installation:

### If installed via npm/pnpm:
```bash
npm uninstall -g mcp-remote
# or
pnpm remove -g mcp-remote
```

### If installed via npm link:
```bash
npm unlink -g mcp-remote
```
(Run from the project directory)

### If installed via pnpm link:
```bash
pnpm unlink --global
```
(Run from the project directory)

## Next Steps

After installation, see the [BUILD_AND_INSTALL.md](docs/BUILD_AND_INSTALL.md) guide for information on:
- Building the project locally
- Running the client and proxy
- TLS configuration

For development workflows, see [LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).
