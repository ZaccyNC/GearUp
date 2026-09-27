import GearDesk, { type CatalogItem } from '@/components/catalog/gear-desk';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const sampleInventory: CatalogItem[] = [
  {
    id: 'demo-basketball',
    name: 'Indoor Basketball',
    description: 'Composite cover · Official size',
    category: 'Court sports',
    location: 'Moore Fitness Center',
    available: 2,
    total: 2,
    trackingMode: 'serialized',
    requiresApproval: false,
    kind: 'ball',
  },
  {
    id: 'demo-cones',
    name: 'Agility Cones · Set of 10',
    description: 'Orange field markers · 10 per set',
    category: 'Training',
    location: 'Moore Fitness Center',
    available: 5,
    total: 5,
    trackingMode: 'bulk',
    requiresApproval: false,
    kind: 'cones',
  },
];

async function loadInventory(): Promise<{ items: CatalogItem[]; source: 'database' | 'sample' }> {
  if (!process.env.DATABASE_URL) {
    return { items: sampleInventory, source: 'sample' };
  }

  try {
    const inventory = await prisma.item.findMany({
      where: { active: true },
      include: {
        category: true,
        location: true,
        units: { select: { status: true } },
      },
      orderBy: { name: 'asc' },
    });

    const items: CatalogItem[] = inventory.map((item) => {
        const serialized = item.trackingMode !== 'bulk';
        const quantity = serialized
          ? item.units.length
          : item.bulkQuantity;

        return {
          id: item.id,
          name: item.name,
          description: item.description ?? 'Campus recreation equipment',
          category: item.category?.name ?? 'General gear',
          location: item.location?.name ?? 'Campus inventory',
          available: serialized
            ? item.units.filter((unit) => unit.status === 'available').length
            : item.bulkQuantity,
          total: quantity,
          trackingMode: serialized ? 'serialized' : 'bulk',
          requiresApproval: item.requiresApproval,
          kind: item.name.toLowerCase().includes('cone') ? 'cones' : 'ball',
        };
      });

    return inventory.length > 0
      ? { items, source: 'database' }
      : { items: sampleInventory, source: 'sample' };
  } catch (error) {
    console.error('Unable to load inventory from the database.', error);
    return { items: sampleInventory, source: 'sample' };
  }
}

export default async function Home() {
  const { items, source } = await loadInventory();

  return <GearDesk initialItems={items} source={source} />;
}
