# MusicTalks Backend API

Backend API server for MusicTalks application.

> **Design docs (project root):** [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) · [../docs/DATA_MODEL.md](../docs/DATA_MODEL.md) · [../docs/API.md](../docs/API.md)

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Error Tracking**: Sentry
- **Background Jobs**: node-cron

## Project Structure

```
backend/
├── src/
│   ├── routes/          # API routes
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── workers/         # Background workers
│   ├── scripts/         # Utility scripts
│   ├── middleware/      # Express middleware
│   ├── config/          # Configuration files
│   ├── utils/           # Utility functions
│   ├── models/          # Database models (if not using Prisma)
│   └── server.ts        # Express app entry point
├── prisma/              # Prisma schema and migrations
└── package.json
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up database**:
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for required environment variables.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## API Endpoints

See [../docs/API.md](../docs/API.md) for the full reference. Route definitions live in `src/routes/`.

## Deployment

This backend is designed to be deployed on Render.com.
