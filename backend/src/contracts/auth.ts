import { z } from 'zod';

/** Nome de usuário do painel (ex.: rafael.souza). Sem e-mail: apenas login. */
export const usernameSchema = z
  .string({ error: 'Informe o usuário.' })
  .trim()
  .toLowerCase()
  .min(3, 'Informe o usuário.')
  .max(40, 'Usuário muito longo.')
  .regex(/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/, 'Use letras, números, ponto, hífen ou sublinhado.');

export const PASSWORD_MIN_LENGTH = 6;

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.').max(200),
    newPassword: z
      .string({ error: 'Informe a nova senha.' })
      .min(PASSWORD_MIN_LENGTH, `A nova senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(200, 'Senha muito longa.'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'A nova senha precisa ser diferente da atual.',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type SessionUser = {
  id: string;
  name: string;
  username: string;
};
