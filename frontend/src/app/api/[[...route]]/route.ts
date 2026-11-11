import { createRequestHandler } from '@orts/backend';
import { revalidatePath } from 'next/cache';

/**
 * A API do backend (Hono) é montada aqui, no mesmo domínio do site.
 * Toda autenticação, validação e regra de negócio fica no pacote backend/.
 */
const handler = createRequestHandler({
  hooks: {
    // Dados comerciais alterados no painel: regenera a página pública.
    onPublicProfileChanged: () => revalidatePath('/'),
  },
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { handler as DELETE, handler as GET, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };
