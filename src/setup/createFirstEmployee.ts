import * as bcrypt from 'bcrypt';
import short from 'short-uuid';

import prisma from '~/lib/prisma';

export async function createFirstEmployee() {
  return prisma.$transaction(async (tx) => {
    const employees = await tx.employee.findMany();

    if (employees.length > 0) return;

    const password = short.generate();
    const hashedPassword = await bcrypt.hash('password', 8);

    return await prisma.employee
      .create({
        data: {
          isAdmin: true,
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@testmail.com',
          password: hashedPassword
        }
      })
      .then(() => {
        console.log(`Created first employee with password: ${password}`);
      });
  });
}
