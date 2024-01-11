// src/tests/helpers/reset-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async () => {
  await prisma.$transaction([
    prisma.visitPart.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.client.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.service.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.cleaningFrequency.deleteMany(),
    prisma.reservationService.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.address.deleteMany()
  ]);
};
