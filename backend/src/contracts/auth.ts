import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Informe o e-mail.' })
    .trim()
    .toLowerCase()
    .max(160)
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};
