import type { AppointmentDTO, AppointmentStatus } from './appointments';

export type StatusCounts = Record<AppointmentStatus, number>;

export type DashboardDTO = {
  generatedAt: string;
  today: {
    date: string;
    total: number;
    byStatus: StatusCounts;
    appointments: AppointmentDTO[];
  };
  next: AppointmentDTO | null;
  pendingConfirmation: { total: number; items: AppointmentDTO[] };
  week: {
    start: string;
    end: string;
    total: number;
    completed: number;
    cancelled: number;
    days: { date: string; total: number; completed: number; cancelled: number }[];
  };
  month: { label: string; total: number; completed: number; cancelled: number };
};
