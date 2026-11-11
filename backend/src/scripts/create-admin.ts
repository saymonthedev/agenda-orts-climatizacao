/**
 * Configuração da conta administrativa pela linha de comando (não existe cadastro público).
 *
 *   npm run admin:create -- --username rafael.souza --name "Rafael Souza"
 *   npm run admin:create -- --username rafael.souza --reset      (redefine a senha)
 *
 * A senha é digitada sem eco no terminal. Em ambientes não interativos, use a
 * variável ADMIN_PASSWORD (nunca passe a senha como argumento de linha de comando).
 * Alternativa sem terminal: defina ADMIN_USERNAME e ADMIN_PASSWORD no ambiente e
 * rode `npm run db:migrate` — a conta é criada se ainda não houver nenhuma.
 */
import '../config/load-env';
import { count, eq } from 'drizzle-orm';
import { PASSWORD_MIN_LENGTH, usernameSchema } from '../contracts/auth';
import { getDb } from '../database/client';
import { sessions, users } from '../database/schema';
import { hashPassword } from '../lib/crypto';
import { displayNameFromUsername } from '../modules/auth/bootstrap';
import { findUserByUsername } from '../modules/auth/auth.service';
import { ask, askHidden } from './prompt';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : '';
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > 200) return 'A senha é longa demais.';
  return null;
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) {
    const problem = validatePassword(fromEnv);
    if (problem) throw new Error(problem);
    return fromEnv;
  }
  for (;;) {
    const password = await askHidden(`Senha (mín. ${PASSWORD_MIN_LENGTH} caracteres): `);
    const problem = validatePassword(password);
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
  const username = usernameSchema.parse(arg('username') || process.env.ADMIN_USERNAME || (await ask('Usuário (ex.: rafael.souza): ')));
  const existing = await findUserByUsername(db, username);

  if (flag('reset')) {
    if (!existing) throw new Error('Nenhuma conta encontrada com este usuário.');
    const passwordHash = await hashPassword(await readPassword());
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    console.log('Senha redefinida. Sessões anteriores foram encerradas.');
    return;
  }

  if (existing) throw new Error('Já existe uma conta com este usuário. Use --reset para redefinir a senha.');

  const [row] = await db.select({ total: count() }).from(users);
  if (Number(row?.total ?? 0) > 0 && !flag('allow-additional')) {
    throw new Error('Já existe uma conta administrativa. Use --allow-additional para criar outra conta.');
  }

  const name = (arg('name') || process.env.ADMIN_NAME || displayNameFromUsername(username)).trim();
  const passwordHash = await hashPassword(await readPassword());
  await db.insert(users).values({ name, username, passwordHash });
  console.log(`Conta "${username}" criada. Acesse /admin/login para entrar.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
