import { z } from 'zod';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Avaliações de clientes exibidas no site.
 * A API do Google manda a nota e o total do perfil da ORTS, mas não os comentários;
 * por isso os comentários são copiados do Google e cadastrados no painel.
 */
const fields = {
  author: z
    .string({ error: 'Informe o nome de quem avaliou.' })
    .trim()
    .min(2, 'Informe o nome de quem avaliou.')
    .max(80, 'Use no máximo 80 caracteres.'),
  rating: z.number({ error: 'Escolha a nota.' }).int().min(1, 'Escolha a nota.').max(5, 'Escolha a nota.'),
  text: z
    .string({ error: 'Cole o comentário da avaliação.' })
    .trim()
    .min(2, 'Cole o comentário da avaliação.')
    .max(1500, 'Use no máximo 1500 caracteres.'),
  /** Mês em que a avaliação foi publicada (AAAA-MM). */
  month: z.string({ error: 'Informe quando foi a avaliação.' }).regex(MONTH, 'Informe quando foi a avaliação.'),
  visible: z.boolean(),
};

export const siteReviewInputSchema = z.object({ ...fields, visible: fields.visible.default(true) });
export const siteReviewUpdateSchema = z.object(fields).partial();

export type SiteReviewInput = z.input<typeof siteReviewInputSchema>;
export type SiteReviewUpdateInput = z.input<typeof siteReviewUpdateSchema>;

export type SiteReviewDTO = {
  id: string;
  author: string;
  rating: number;
  text: string;
  month: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Avaliação publicada no site (sem dados internos). */
export type PublicReviewDTO = Pick<SiteReviewDTO, 'id' | 'author' | 'rating' | 'text' | 'month'>;
