import type { AppointmentDTO } from '@orts/backend/contracts';
import { formatLongDate } from './format';

/** Preenche o modelo de mensagem de confirmação configurado no painel. */
export function buildConfirmationMessage(template: string, appointment: AppointmentDTO, businessName: string): string {
  const address = [appointment.address, appointment.neighborhood].filter(Boolean).join(' - ');
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
  return `${appointment.address}, ${appointment.neighborhood}, ${appointment.city} - SC`;
}
