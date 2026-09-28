'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';

type DemoRole = 'student' | 'staff' | 'admin';
type StaffAction = 'approve' | 'decline' | 'checkout' | 'confirm_return';
type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const failed = (message: string): ActionResult => ({ ok: false, message });
const succeeded = (message: string): ActionResult => ({ ok: true, message });
const activeReservationStatuses = ['pending_approval', 'approved', 'checked_out', 'return_requested'];

function isDemoDevelopment() {
  return process.env.NODE_ENV !== 'production';
}

export async function createDemoReservation(
  itemId: string,
  requestedUnitId?: string,
): Promise<ActionResult> {
  if (!isDemoDevelopment()) {
    return failed('Demo requests are disabled in production until sign-in is configured.');
  }
  if (!itemId || itemId.length > 64) return failed('That inventory item could not be found.');

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const [item, user] = await Promise.all([
        transaction.item.findUnique({ where: { id: itemId } }),
        transaction.user.findUnique({ where: { email: 'student@trevecca.edu' } }),
      ]);
      if (!item?.active) return failed('That item is no longer available.');
      if (!user) return failed('Demo accounts are missing. Run npm run db:seed first.');

      let unitId: string | undefined;
      if (item.trackingMode === 'bulk') {
        const activeReservations = await transaction.reservation.aggregate({
          where: { itemId, status: { in: activeReservationStatuses } },
          _sum: { qty: true },
        });
        if (item.bulkQuantity - (activeReservations._sum.qty ?? 0) < 1) {
          return failed('There is no available quantity left for this item.');
        }
      } else {
        const unit = requestedUnitId
          ? await transaction.itemUnit.findFirst({
            where: { id: requestedUnitId, itemId, status: 'available' },
          })
          : await transaction.itemUnit.findFirst({
            where: { itemId, status: 'available' },
            orderBy: { assetTag: 'asc' },
          });
        if (!unit) return failed('That unit is no longer available. Refresh and choose another.');

        const reserved = await transaction.itemUnit.updateMany({
          where: { id: unit.id, status: 'available' },
          data: { status: 'reserved' },
        });
        if (reserved.count !== 1) return failed('That unit was just requested. Refresh and try again.');
        unitId = unit.id;
      }

      const startsAt = new Date();
      const endsAt = new Date(startsAt);
      endsAt.setDate(endsAt.getDate() + item.maxDays);
      await transaction.reservation.create({
        data: {
          userId: user.id,
          itemId,
          unitId,
          qty: 1,
          startsAt,
          endsAt,
          status: item.requiresApproval ? 'pending_approval' : 'approved',
        },
      });
      return succeeded(`Request saved for ${item.name}.`);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.ok) revalidatePath('/');
    return result;
  } catch (error) {
    console.error('Unable to save demo reservation.', error);
    return failed('Could not save the request. Refresh and try again.');
  }
}

export async function updateDemoReservation(
  reservationId: string,
  actorRole: DemoRole,
  action: StaffAction,
): Promise<ActionResult> {
  if (!isDemoDevelopment()) {
    return failed('Demo checkout actions are disabled in production until sign-in is configured.');
  }
  if (actorRole !== 'staff' && actorRole !== 'admin') {
    return failed('Switch to Equipment Staff or Administrator to update the checkout queue.');
  }
  if (!reservationId || reservationId.length > 64) return failed('That request could not be found.');

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findUnique({ where: { id: reservationId } });
      if (!reservation) return failed('That request no longer exists.');

      const allowed = {
        approve: reservation.status === 'pending_approval',
        decline: reservation.status === 'pending_approval' || reservation.status === 'approved',
        checkout: reservation.status === 'approved',
        confirm_return: reservation.status === 'return_requested',
      }[action];
      if (!allowed) return failed('That request is no longer in a state for this action.');

      const nextStatus = {
        approve: 'approved',
        decline: 'declined',
        checkout: 'checked_out',
        confirm_return: 'returned',
      }[action];

      if (reservation.unitId && action !== 'approve') {
        const expectedStatus = action === 'checkout'
          ? 'reserved'
          : action === 'confirm_return'
            ? 'checked_out'
            : 'reserved';
        const unitStatus = action === 'checkout' ? 'checked_out' : 'available';
        const updatedUnit = await transaction.itemUnit.updateMany({
          where: { id: reservation.unitId, status: expectedStatus },
          data: { status: unitStatus },
        });
        if (updatedUnit.count !== 1) return failed('The unit changed. Refresh the checkout queue.');
      }

      await transaction.reservation.update({
        where: { id: reservationId },
        data: { status: nextStatus },
      });

      const messages = {
        approve: 'Request approved.',
        decline: 'Request declined. The item is available again.',
        checkout: 'Checkout saved.',
        confirm_return: 'Return confirmed. The item is available again.',
      };
      return succeeded(messages[action]);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.ok) revalidatePath('/');
    return result;
  } catch (error) {
    console.error('Unable to update demo reservation.', error);
    return failed('Could not update the request. Refresh and try again.');
  }
}

export async function cancelDemoReservation(reservationId: string): Promise<ActionResult> {
  if (!isDemoDevelopment()) {
    return failed('Demo requests are disabled in production until sign-in is configured.');
  }
  if (!reservationId || reservationId.length > 64) return failed('That request could not be found.');

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const student = await transaction.user.findUnique({ where: { email: 'student@trevecca.edu' } });
      const reservation = await transaction.reservation.findUnique({ where: { id: reservationId } });
      if (!student || !reservation || reservation.userId !== student.id) {
        return failed('That request could not be found.');
      }
      if (reservation.status !== 'pending_approval' && reservation.status !== 'approved') {
        return failed('Only requests waiting for approval or pickup can be cancelled.');
      }

      if (reservation.unitId) {
        const released = await transaction.itemUnit.updateMany({
          where: { id: reservation.unitId, status: 'reserved' },
          data: { status: 'available' },
        });
        if (released.count !== 1) return failed('The unit changed. Refresh and try again.');
      }
      await transaction.reservation.update({
        where: { id: reservationId },
        data: { status: 'cancelled' },
      });
      return succeeded('Request cancelled. The item is available again.');
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.ok) revalidatePath('/');
    return result;
  } catch (error) {
    console.error('Unable to cancel demo reservation.', error);
    return failed('Could not cancel the request. Refresh and try again.');
  }
}

export async function requestDemoReturn(reservationId: string): Promise<ActionResult> {
  if (!isDemoDevelopment()) {
    return failed('Demo return requests are disabled in production until sign-in is configured.');
  }
  if (!reservationId || reservationId.length > 64) return failed('That checkout could not be found.');

  try {
    const student = await prisma.user.findUnique({ where: { email: 'student@trevecca.edu' } });
    if (!student) return failed('Demo accounts are missing. Run npm run db:seed first.');
    const updated = await prisma.reservation.updateMany({
      where: { id: reservationId, userId: student.id, status: 'checked_out' },
      data: { status: 'return_requested' },
    });
    if (updated.count !== 1) return failed('That checkout cannot be returned right now.');
    revalidatePath('/');
    return succeeded('Return requested. Equipment Staff will confirm it when the gear is received.');
  } catch (error) {
    console.error('Unable to request demo return.', error);
    return failed('Could not request the return. Refresh and try again.');
  }
}

export async function adjustDemoInventory(
  itemId: string,
  amount: number,
): Promise<ActionResult> {
  if (!isDemoDevelopment()) {
    return failed('Demo inventory changes are disabled in production until sign-in is configured.');
  }
  if (!itemId || itemId.length > 64 || (amount !== 1 && amount !== -1)) {
    return failed('That inventory change is not valid.');
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const item = await transaction.item.findUnique({ where: { id: itemId } });
      if (!item) return failed('That inventory item no longer exists.');

      if (item.trackingMode === 'bulk') {
        const activeReservations = await transaction.reservation.aggregate({
          where: { itemId, status: { in: activeReservationStatuses } },
          _sum: { qty: true },
        });
        const reservedQuantity = activeReservations._sum.qty ?? 0;
        if (amount < 0 && item.bulkQuantity - reservedQuantity < 1) {
          return failed('Cannot remove stock that is reserved or checked out.');
        }
        await transaction.item.update({
          where: { id: itemId },
          data: { bulkQuantity: { increment: amount } },
        });
      } else if (amount > 0) {
        await transaction.itemUnit.create({
          data: {
            itemId,
            assetTag: `DEMO-${randomUUID()}`,
            condition: 'Good',
            status: 'available',
          },
        });
      } else {
        const unit = await transaction.itemUnit.findFirst({
          where: { itemId, status: 'available' },
          orderBy: { assetTag: 'desc' },
        });
        if (!unit) return failed('There is no available unit to remove.');
        await transaction.itemUnit.update({
          where: { id: unit.id },
          data: { status: 'retired' },
        });
      }

      return succeeded(`Inventory updated for ${item.name}.`);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.ok) revalidatePath('/');
    return result;
  } catch (error) {
    console.error('Unable to adjust demo inventory.', error);
    return failed('Could not update inventory. Refresh and try again.');
  }
}
