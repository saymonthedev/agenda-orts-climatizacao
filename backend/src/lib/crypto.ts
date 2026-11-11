import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scrypt = (password: string, salt: Buffer, keyLen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });

/**
 * Parâmetros do scrypt (recomendação OWASP: N=2^16, r=8, p=1 ≈ 64 MiB).
 * Formato salvo: scrypt$logN$r$p$salt$hash (base64url).
 */
const PARAMS = { logN: 16, r: 8, p: 1, keyLen: 64 } as const;

const maxmemFor = (N: number, r: number) => 256 * N * r;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 2 ** PARAMS.logN;
  const key = await scrypt(password.normalize('NFKC'), salt, PARAMS.keyLen, {
    N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: maxmemFor(N, PARAMS.r),
  });
  return ['scrypt', PARAMS.logN, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const logN = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![logN, r, p].every(Number.isInteger) || logN < 10 || logN > 20) return false;
  const salt = Buffer.from(parts[4] ?? '', 'base64url');
  const expected = Buffer.from(parts[5] ?? '', 'base64url');
  if (salt.length < 16 || expected.length < 32) return false;
  const N = 2 ** logN;
  const key = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: maxmemFor(N, r) });
  return timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | null = null;
/** Verificação "falsa" para igualar o tempo de resposta quando o e-mail não existe. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('orts-dummy-password-for-timing');
  await verifyPassword(password, await dummyHash);
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
