// src/tests/helpers/reset-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async () => {
  await prisma.$transaction([
    prisma.employee.deleteMany(),
    prisma.service.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.employeeService.deleteMany(),
    prisma.cleaningFrequency.deleteMany(),
    prisma.reservationService.deleteMany(),
    prisma.visitPart.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.client.deleteMany(),
    prisma.address.deleteMany()
  ]);
};
