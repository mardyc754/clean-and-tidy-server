# Clean and Tidy Server

Backend part of the application for the cleaning company, written in TypeScript, Node.js, Express.js and Prisma.

## To run the project

First of all, make sure you have the following software installed:
- Node.js >= 18
- pnpm >= 8


1. Configure database - in order to do that, create `.env` file with following variables:
- `DATABASE_URL` - the URL to PostgreSQL database
- (optional) `SHADOW_DATABASE_URL` - the URL to PostgreSQL shadow database, required sometimes for development
- `JWT_SECRET` - secret for JsonWebToken
- `FRONTEND_BASE_URL` - base URL for the client app

2. Generate Prisma Client
```bash
pnpm db-push
```

3. Install libraries

```bash
pnpm install
```

4. Run the app

a) In development mode:

```bash
pnpm dev
```

b) In production mode:

Set the `NODE_ENV` environment variable:

```
NODE_ENV="production"
```

and then build and run the app:

```bash
pnpm start
```



