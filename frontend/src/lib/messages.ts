import type { AppointmentDTO } from '@orts/backend/contracts';
import { formatLongDate } from './format';

/** Preenche o modelo de mensagem de confirmação configurado no painel. */
export function buildConfirmationMessage(template: string, appointment: AppointmentDTO, businessName: string): string {
  const address = [appointment.address, appointment.neighborhood].filter(Boolean).join(' - ');
  if (!address && template.includes('{endereco}')) {
    // ainda sem endereço: tira o trecho e aproveita a mensagem para pedi-lo
    const stripped = template.replace(/,?\s*no endereço\s*\{endereco\}/i, '');
    template = stripped !== template ? `${stripped.trimEnd()} Pode me enviar o endereço completo?` : template.split('{endereco}').join('a confirmar');
  }
  const values: Record<string, string> = {
    '{cliente}': appointment.clientName.split(' ')[0] ?? appointment.clientName,
    '{servico}': appointment.serviceType.name.toLowerCase(),
    '{data}': formatLongDate(appointment.date),
    '{horario}': appointment.startTime,
    '{endereco}': address,
    '{empresa}': businessName,
  };
  return Object.entries(values).reduce((text, [key, value]) => text.split(key).join(value), template);
}

export function mapsQueryFor(appointment: Pick<AppointmentDTO, 'address' | 'neighborhood' | 'city'>): string {
  return `${[appointment.address, appointment.neighborhood, appointment.city ?? 'Jaraguá do Sul'].filter(Boolean).join(', ')} - SC`;
}

/** Endereço e bairro, sem as partes em branco ("" quando ainda não foram informados). */
export function placeOf(appointment: Pick<AppointmentDTO, 'address' | 'neighborhood'>, separator = ' · '): string {
  return [appointment.address, appointment.neighborhood].filter(Boolean).join(separator);
}
