/**
 * Configuração inicial segura da conta administrativa (não existe cadastro público).
 *
 *   npm run admin:create -- --email dono@empresa.com --name "Nome do proprietário"
 *   npm run admin:create -- --email dono@empresa.com --reset      (redefine a senha)
 *
 * A senha é digitada sem eco no terminal. Em ambientes não interativos,
 * use a variável ADMIN_PASSWORD (nunca passe a senha como argumento).
 */
import { count, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../database/client';
import { sessions, users } from '../database/schema';
import { hashPassword } from '../lib/crypto';
import { ask, askHidden } from './prompt';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

function validatePassword(password: string, email: string): string | null {
  if (password.length < 10) return 'A senha precisa ter pelo menos 10 caracteres.';
  if (password.length > 200) return 'A senha é longa demais.';
  if (password.toLowerCase().includes(email.split('@')[0]!.toLowerCase())) return 'A senha não pode conter o e-mail.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return null;
}

async function readPassword(email: string): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) {
    const problem = validatePassword(fromEnv, email);
    if (problem) throw new Error(problem);
    return fromEnv;
  }
  for (;;) {
    const password = await askHidden('Senha (mín. 10 caracteres, letras e números): ');
    const problem = validatePassword(password, email);
    if (problem) {
      console.log(`  ${problem}`);
      continue;
    }
    const confirm = await askHidden('Confirme a senha: ');
    if (confirm !== password) {
      console.log('  As senhas não conferem.');
      continue;
    }
    return password;
  }
}

async function main() {
  const db = await getDb();
  const reset = flag('reset');
  const emailInput = arg('email') || (await ask('E-mail do administrador: '));
  const email = emailSchema.parse(emailInput);

  const [existing] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  if (reset) {
    if (!existing) throw new Error('Nenhuma conta encontrada com este e-mail.');
    const passwordHash = await hashPassword(await readPassword(email));
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    console.log('Senha redefinida. Sessões anteriores foram encerradas.');
    return;
  }

  if (existing) throw new Error('Já existe uma conta com este e-mail. Use --reset para redefinir a senha.');

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(users);
  if (Number(total) > 0 && !flag('allow-additional')) {
    throw new Error('Já existe uma conta administrativa. Use --allow-additional para criar outra conta.');
  }

  const name = (arg('name') || (await ask('Nome para exibição: '))).trim() || 'Administrador';
  const passwordHash = await hashPassword(await readPassword(email));
  await db.insert(users).values({ name, email, passwordHash });
  console.log(`Conta criada para ${email}. Acesse /admin/login para entrar.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
