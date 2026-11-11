/** Carrega backend/.env (se existir) para scripts executados via linha de comando. */
try {
  process.loadEnvFile('.env');
} catch {
  /* arquivo opcional */
}
