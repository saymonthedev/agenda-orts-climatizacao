import type { PublicProfileDTO } from '../../contracts/settings';
import { getDb } from '../../database/client';
import { logger } from '../../lib/logger';
import { getSettingsRow, toPublicProfile } from './settings.service';

export const EMPTY_PUBLIC_PROFILE: PublicProfileDTO = {
  businessName: 'ORTS Climatização',
  whatsapp: null,
  phone: null,
  email: null,
  address: 'Vila Nova, Jaraguá do Sul - SC',
  serviceArea: null,
  instagramUrl: null,
  hours: null,
};

/**
 * Dados comerciais públicos para o site institucional.
 * Nunca lança erro: sem banco disponível, o site é gerado com os valores padrão.
 */
export async function getPublicProfile(): Promise<PublicProfileDTO> {
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (!process.env.DATABASE_URL && isBuild) return EMPTY_PUBLIC_PROFILE;
  try {
    return toPublicProfile(await getSettingsRow(await getDb()));
  } catch (err) {
    logger.warn('Perfil público indisponível; usando valores padrão', { err });
    return EMPTY_PUBLIC_PROFILE;
  }
}
