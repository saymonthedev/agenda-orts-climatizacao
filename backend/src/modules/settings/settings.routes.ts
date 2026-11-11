import { Hono } from 'hono';
import { settingsInputSchema } from '../../contracts/settings';
import type { AppEnv } from '../../http/types';
import { parseJson } from '../../http/validate';
import { getSettingsRow, toSettingsDTO, updateSettings } from './settings.service';

export const settingsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ settings: toSettingsDTO(await getSettingsRow(c.var.db)) }))
  .put('/', async (c) => {
    const input = await parseJson(c, settingsInputSchema);
    const settings = await updateSettings(c.var.db, input);
    await c.var.hooks.onPublicProfileChanged?.();
    return c.json({ settings });
  });
