import prismaTest from './prisma';

export default async function resetDb() {
  await prismaTest.$transaction([
    prismaTest.visitPart.deleteMany(),
    prismaTest.visit.deleteMany(),
    prismaTest.client.deleteMany(),
    prismaTest.employee.deleteMany(),
    prismaTest.service.deleteMany(),
    prismaTest.unit.deleteMany(),
    prismaTest.cleaningFrequency.deleteMany(),
    prismaTest.reservationService.deleteMany(),
    prismaTest.reservation.deleteMany(),
    prismaTest.address.deleteMany()
  ]);
}
