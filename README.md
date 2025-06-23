# Spacetime Panel

A web-based admin panel for managing SpacetimeDB applications.

## Setup Instructions

### Clone the Repository

```bash
git clone <repository-url>
cd spacetime-panel
```

### Install Dependencies

```bash
npm install
```

### Environment Variables

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit the `.env` file with your specific configuration values.

### Start SpacetimeDB

```bash
spacetime start
```

This command starts the SpacetimeDB server locally. Keep this running in a terminal window.

### Publish Your Module

```bash
spacetime publish example
```

This publishes your SpacetimeDB module to the running server. Replace `example` with your actual module name.

### Monitor Logs (Optional)

```bash
spacetime logs example --follow
```

### Generate TypeScript Bindings

```bash
spacetime generate --lang typescript --out-dir ../spacetime-panel/src/generated
```

This generates TypeScript type definitions and client code from your SpacetimeDB schema. The generated files will be placed in the specified output directory.

## Development

After completing the setup, you can run the development server:

```bash
npm run dev
```
