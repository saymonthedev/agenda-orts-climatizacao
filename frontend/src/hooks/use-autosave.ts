'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error';
/** Resultado de um envio: sem mudanças, salvo, bloqueado pela validação ou recusado. */
export type AutosaveOutcome = 'unchanged' | 'saved' | 'invalid' | 'error';

type Options<T> = {
  /** Valor atual do formulário. */
  value: T;
  /** Valor que já está salvo no servidor quando a tela abre. */
  initial: T;
  /** Valida antes de enviar. Devolve os erros por campo (objeto vazio = válido). */
  validate?: (value: T) => Record<string, string>;
  save: (value: T) => Promise<unknown>;
  /** Espera depois da última mudança antes de salvar. */
  delay?: number;
  enabled?: boolean;
};

/**
 * Salvamento automático: espera a pessoa parar de mexer, valida e envia.
 * Mudanças feitas durante um envio entram no envio seguinte; um envio que falhou
 * não é repetido sozinho com os mesmos dados (o botão "Tentar de novo" reenvia).
 * Ao sair da tela ou esconder o app, o que estiver pendente é enviado na hora.
 */
export function useAutosave<T>({ value, initial, validate, save, delay = 700, enabled = true }: Options<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const key = JSON.stringify(value);
  const latest = useRef({ value, key });
  latest.current = { value, key };
  const savedKey = useRef(JSON.stringify(initial));
  const failedKey = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const run = useCallback(async (): Promise<AutosaveOutcome> => {
    clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const { value: snapshot, key: snapshotKey } = latest.current;
    if (snapshotKey === savedKey.current) {
      setStatus((s) => (s === 'pending' || s === 'saving' ? 'saved' : s));
      return 'unchanged';
    }
    const found = validateRef.current?.(snapshot) ?? {};
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus('invalid');
      setMessage(Object.values(found)[0] ?? null);
      return 'invalid';
    }
    setStatus('saving');
    setMessage(null);
    let outcome: AutosaveOutcome = 'saved';
    const attempt = (async () => {
      try {
        await saveRef.current(snapshot);
        savedKey.current = snapshotKey;
        failedKey.current = null;
        setStatus(latest.current.key === snapshotKey ? 'saved' : 'pending');
      } catch (err) {
        outcome = 'error';
        failedKey.current = snapshotKey;
        setErrors(err instanceof ApiError ? err.fields : {});
        setMessage(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
        setStatus('error');
      }
    })();
    inFlight.current = attempt;
    await attempt;
    inFlight.current = null;
    const now = latest.current.key;
    if (now !== savedKey.current && now !== failedKey.current) {
      timer.current = setTimeout(() => void runRef.current(), 250);
    }
    return outcome;
  }, []);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!enabled || key === savedKey.current || key === failedKey.current) return;
    setStatus((s) => (s === 'saving' ? s : 'pending'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void runRef.current(), delay);
  }, [key, enabled, delay]);

  useEffect(() => {
    const pending = () => latest.current.key !== savedKey.current && latest.current.key !== failedKey.current;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && pending()) void runRef.current();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!pending()) return;
      void runRef.current();
      e.preventDefault();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timer.current);
      if (pending()) void runRef.current();
    };
  }, []);

  return {
    status,
    errors,
    message,
    /** Salva agora o que estiver pendente (ex.: ao apertar Enter ou fechar a janela). */
    flush: () => runRef.current(),
    /** Reenvia depois de uma falha. */
    retry: () => {
      failedKey.current = null;
      return runRef.current();
    },
  };
}
