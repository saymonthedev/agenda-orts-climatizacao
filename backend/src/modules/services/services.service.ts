import { asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { ServiceTypeDTO, serviceInputSchema, serviceUpdateSchema } from '../../contracts/services';
import type { Database } from '../../database/client';
import { serviceTypes, type ServiceTypeRow } from '../../database/schema';
import { NotFoundError } from '../../http/errors';

export function toServiceDTO(row: ServiceTypeRow): ServiceTypeDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    color: row.color,
    active: row.active,
    sortOrder: row.sortOrder,
    priceCents: row.priceCents,
  };
}

export async function listServices(db: Database): Promise<ServiceTypeDTO[]> {
  const rows = await db.select().from(serviceTypes).orderBy(asc(serviceTypes.sortOrder), asc(serviceTypes.name));
  return rows.map(toServiceDTO);
}

export async function getService(db: Database, id: string): Promise<ServiceTypeRow | null> {
  const [row] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id)).limit(1);
  return row ?? null;
}

export async function createService(db: Database, input: z.output<typeof serviceInputSchema>) {
  const [row] = await db.insert(serviceTypes).values(input).returning();
  if (!row) throw new Error('Falha ao criar serviço.');
  return toServiceDTO(row);
}

export async function updateService(db: Database, id: string, input: z.output<typeof serviceUpdateSchema>) {
  const [row] = await db
    .update(serviceTypes)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(serviceTypes.id, id))
    .returning();
  if (!row) throw new NotFoundError('Serviço não encontrado.');
  return toServiceDTO(row);
}
