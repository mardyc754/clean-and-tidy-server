// src/tests/helpers/reset-db.ts
import { PrismaClient } from '@prisma/client';

const prismaTest = new PrismaClient();

export default prismaTest;
