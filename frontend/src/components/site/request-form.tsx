'use client';

import type { PublicProfileDTO } from '@orts/backend/contracts';
import { ArrowUpRight, Check, Phone } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { services } from '@/content/site';
import { formatPhone } from '@/lib/format';
import { telLink, whatsappLink } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { TextArea, TextField } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { WhatsAppIcon } from './icons';

type Period = 'manha' | 'tarde' | 'qualquer';
const PERIODS: Record<Period, string> = { manha: 'Manhã', tarde: 'Tarde', qualquer: 'Qualquer horário' };

const serviceOptions = [
  ...services.map((s) => ({ value: s.id, label: s.title })),
  { value: 'outro', label: 'Outro serviço' },
];

type Errors = Partial<Record<'name' | 'service' | 'neighborhood', string>>;

/**
 * Monta a solicitação e abre a conversa no WhatsApp com a mensagem pronta.
 * Nenhum dado é armazenado pelo site.
 */
export function RequestForm({ profile, initialService, tone = 'paper' }: { profile: PublicProfileDTO; initialService?: string; tone?: 'paper' | 'light' }) {
  const formId = useId();
  const [name, setName] = useState('');
  const [service, setService] = useState(initialService ?? '');
  const [neighborhood, setNeighborhood] = useState('');
  const [period, setPeriod] = useState<Period>('qualquer');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean(profile.whatsapp);

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Informe seu nome.';
    if (!service) next.service = 'Escolha o serviço.';
    if (neighborhood.trim().length < 2) next.neighborhood = 'Informe o bairro do atendimento.';
    return next;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.service) return document.getElementById(`${formId}-service`)?.focus();
    if (next.neighborhood) return neighborhoodRef.current?.focus();
    if (!profile.whatsapp) return;

    const serviceLabel = serviceOptions.find((o) => o.value === service)?.label ?? service;
    const lines = [
      `Olá, ${profile.businessName}! Gostaria de solicitar um atendimento.`,
      '',
      `• Nome: ${name.trim()}`,
      `• Serviço: ${serviceLabel}`,
      `• Bairro: ${neighborhood.trim()}`,
      `• Melhor período: ${PERIODS[period]}`,
    ];
    if (details.trim()) lines.push(`• Detalhes: ${details.trim()}`);
    window.open(whatsappLink(profile.whatsapp, lines.join('\n')), '_blank', 'noopener,noreferrer');
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4 py-2" role="status">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-status-completed-bg text-status-completed-fg">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">Mensagem pronta no WhatsApp</p>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            Confira os dados e toque em enviar na conversa que abrimos. Se ela não abriu, use o botão abaixo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="dark" onClick={() => setSent(false)}>
            Editar solicitação
          </Button>
          {profile.whatsapp && (
            <Button asChild variant="secondary">
              <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noopener noreferrer">
                Abrir WhatsApp <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5" aria-describedby={`${formId}-privacy`}>
      <TextField
        ref={nameRef}
        label="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        maxLength={80}
        tone={tone}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          id={`${formId}-service`}
          label="Serviço"
          value={service}
          onChange={setService}
          options={serviceOptions}
          placeholder="Escolha o serviço"
          error={errors.service}
          tone={tone}
        />
        <TextField
          ref={neighborhoodRef}
          label="Bairro"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          error={errors.neighborhood}
          maxLength={60}
          tone={tone}
        />
      </div>
      <Segmented
        label="Melhor período"
        value={period}
        onChange={setPeriod}
        options={(Object.keys(PERIODS) as Period[]).map((p) => ({ value: p, label: PERIODS[p] }))}
        fullWidth
        size="sm"
      />
      <TextArea
        label="Detalhes"
        optional
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Ex.: modelo do aparelho, quantidade de equipamentos, andar do apartamento…"
        maxLength={500}
        rows={3}
        tone={tone}
      />
      {canSend ? (
        <Button type="submit" variant="dark" size="lg" className="w-full sm:w-auto sm:self-start">
          <WhatsAppIcon className="size-5" /> Continuar no WhatsApp
        </Button>
      ) : (
        <div className="rounded-md border border-line bg-porcelain/70 p-4 text-sm leading-relaxed text-ink-soft">
          O atendimento pelo WhatsApp estará disponível em breve.
          {profile.phone && (
            <>
              {' '}
              Enquanto isso, ligue para{' '}
              <a className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-champagne-500 underline-offset-4" href={telLink(profile.phone)}>
                <Phone className="size-3.5" aria-hidden="true" />
                {formatPhone(profile.phone)}
              </a>
              .
            </>
          )}
        </div>
      )}
      <p id={`${formId}-privacy`} className="text-xs leading-relaxed text-subtle">
        Seus dados não ficam salvos no site: a mensagem é enviada diretamente pelo seu WhatsApp.
      </p>
    </form>
  );
}
