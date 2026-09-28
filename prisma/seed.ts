import { prisma } from '../lib/db/client';

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { key: 'admin' },
    update: {},
    create: { key: 'admin', name: 'Administrator' },
  });

  const staffRole = await prisma.role.upsert({
    where: { key: 'staff' },
    update: { name: 'Equipment Staff' },
    create: { key: 'staff', name: 'Equipment Staff' },
  });

  const borrowerRole = await prisma.role.upsert({
    where: { key: 'borrower' },
    update: {},
    create: { key: 'borrower', name: 'Student Borrower' },
  });

  const permissionKeys = [
    'item.view',
    'item.manage',
    'reservation.create.self',
    'reservation.approve',
    'checkout.perform',
  ];
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  const grants = [
    { roleId: adminRole.id, permissions: permissionKeys },
    {
      roleId: staffRole.id,
      permissions: ['item.view', 'reservation.approve', 'checkout.perform'],
    },
    {
      roleId: borrowerRole.id,
      permissions: ['item.view', 'reservation.create.self'],
    },
  ];
  for (const grant of grants) {
    for (const permissionKey of grant.permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionKey: { roleId: grant.roleId, permissionKey } },
        update: {},
        create: { roleId: grant.roleId, permissionKey },
      });
    }
  }

  const student = await prisma.user.upsert({
    where: { email: 'student@trevecca.edu' },
    update: { displayName: 'Alex Student (Demo)' },
    create: { email: 'student@trevecca.edu', displayName: 'Alex Student (Demo)' },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@trevecca.edu' },
    update: { displayName: 'Sam Staff (Demo)' },
    create: { email: 'staff@trevecca.edu', displayName: 'Sam Staff (Demo)' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@trevecca.edu' },
    update: { displayName: 'Taylor Admin (Demo)' },
    create: { email: 'admin@trevecca.edu', displayName: 'Taylor Admin (Demo)' },
  });

  for (const assignment of [
    { userId: student.id, roleId: borrowerRole.id },
    { userId: staff.id, roleId: staffRole.id },
    { userId: admin.id, roleId: adminRole.id },
  ]) {
    const existing = await prisma.roleAssignment.findFirst({
      where: { ...assignment, scopeType: 'global', scopeId: null },
    });
    if (!existing) {
      await prisma.roleAssignment.create({
        data: { ...assignment, scopeType: 'global' },
      });
    }
  }

  let category = await prisma.category.findFirst({ where: { name: 'Intramural Gear' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'Intramural Gear' } });
  }

  let location = await prisma.location.findFirst({ where: { name: 'Moore Fitness Center' } });
  if (!location) {
    location = await prisma.location.create({ data: { name: 'Moore Fitness Center' } });
  }

  const ball = await prisma.item.findFirst({
    where: {
      name: 'Spalding Indoor Basketball',
      categoryId: category.id,
      locationId: location.id,
    },
  });
  const ballItem = ball ?? await prisma.item.create({
    data: {
      name: 'Spalding Indoor Basketball',
      description: 'Official size indoor composite basketball.',
      categoryId: category.id,
      locationId: location.id,
      trackingMode: 'serialized',
    },
  });

  for (const unit of [
    { assetTag: 'TNU-BB-01', condition: 'Excellent' },
    { assetTag: 'TNU-BB-02', condition: 'Good' },
  ]) {
    await prisma.itemUnit.upsert({
      where: { assetTag: unit.assetTag },
      update: {},
      create: { ...unit, itemId: ballItem.id, status: 'available' },
    });
  }

  const cones = await prisma.item.findFirst({
    where: {
      name: 'Agility Cones (Set of 10)',
      categoryId: category.id,
      locationId: location.id,
    },
  });
  if (!cones) {
    await prisma.item.create({
      data: {
        name: 'Agility Cones (Set of 10)',
        description: 'Orange training cones for field setup.',
        categoryId: category.id,
        locationId: location.id,
        trackingMode: 'bulk',
        bulkQuantity: 5,
      },
    });
  }

  console.log('Demo roles, permissions, users, and intramural inventory are ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());