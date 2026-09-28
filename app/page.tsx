import GearUp, { type CatalogItem, type CatalogRequest } from '@/components/catalog/gear-up';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const activeStatuses = ['pending_approval', 'approved', 'checked_out', 'return_requested'];

const sampleInventory: CatalogItem[] = [
  {
    id: 'demo-basketball',
    name: 'Indoor Basketball',
    description: 'Composite cover · Official size',
    category: 'Court sports',
    available: 2,
    total: 2,
    trackingMode: 'serialized',
    requiresApproval: false,
    kind: 'ball',
    units: [],
  },
  {
    id: 'demo-cones',
    name: 'Agility Cones · Set of 10',
    description: 'Orange field markers · 10 per set',
    category: 'Training',
    available: 5,
    total: 5,
    trackingMode: 'bulk',
    requiresApproval: false,
    kind: 'cones',
    units: [],
  },
];

async function loadInventory(): Promise<{
  items: CatalogItem[];
  requests: CatalogRequest[];
  studentRequests: CatalogRequest[];
  hasDatabaseInventory: boolean;
}> {
  if (!process.env.DATABASE_URL) {
    return { items: sampleInventory, requests: [], studentRequests: [], hasDatabaseInventory: false };
  }

  try {
    const [inventory, reservations, student] = await Promise.all([
      prisma.item.findMany({
        where: { active: true },
        include: {
          category: true,
          units: { select: { id: true, assetTag: true, status: true } },
          reservations: {
            where: { status: { in: activeStatuses } },
            select: { qty: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.reservation.findMany({
        where: { status: { in: activeStatuses } },
        include: {
          item: { select: { name: true } },
          user: { select: { id: true, displayName: true, email: true } },
          unit: { select: { assetTag: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findUnique({ where: { email: 'student@trevecca.edu' }, select: { id: true } }),
    ]);

    const items: CatalogItem[] = inventory.map((item) => {
      const serialized = item.trackingMode !== 'bulk';
      const activeUnits = item.units.filter((unit) => unit.status !== 'retired');
      const availableUnits = activeUnits
        .filter((unit) => unit.status === 'available')
        .map((unit) => ({ id: unit.id, assetTag: unit.assetTag }));
      const reservedQuantity = item.reservations.reduce((sum, reservation) => sum + reservation.qty, 0);

      return {
        id: item.id,
        name: item.name,
        description: item.description ?? 'Campus recreation equipment',
        category: item.category?.name ?? 'General gear',
        available: serialized
          ? availableUnits.length
          : Math.max(0, item.bulkQuantity - reservedQuantity),
        total: serialized ? activeUnits.length : item.bulkQuantity,
        trackingMode: serialized ? 'serialized' : 'bulk',
        requiresApproval: item.requiresApproval,
        kind: item.name.toLowerCase().includes('cone') ? 'cones' : 'ball',
        units: availableUnits,
      };
    });

    const toCatalogRequest = (reservation: (typeof reservations)[number]): CatalogRequest => ({
      id: reservation.id,
      itemId: reservation.itemId,
      itemName: reservation.item.name,
      requestedBy: reservation.user.displayName ?? reservation.user.email,
      status: reservation.status as CatalogRequest['status'],
      unitTag: reservation.unit?.assetTag ?? null,
    });
    const requests = reservations.map(toCatalogRequest);
    const studentRequests = student
      ? reservations.filter((reservation) => reservation.user.id === student.id).map(toCatalogRequest)
      : [];

    return inventory.length > 0
      ? { items, requests, studentRequests, hasDatabaseInventory: true }
      : { items: sampleInventory, requests: [], studentRequests: [], hasDatabaseInventory: false };
  } catch (error) {
    console.error('Unable to load inventory.', error);
    return { items: sampleInventory, requests: [], studentRequests: [], hasDatabaseInventory: false };
  }
}

export default async function Home() {
  const { items, requests, studentRequests, hasDatabaseInventory } = await loadInventory();

  return (
    <GearUp
      initialItems={items}
      initialRequests={requests}
      initialStudentRequests={studentRequests}
      mutationsEnabled={process.env.NODE_ENV !== 'production' && hasDatabaseInventory}
    />
  );
}
