import { cn } from '@/lib/cn';

/** Linhas de fluxo de ar (motivo das ondas do símbolo), animadas com CSS. */
export function Airflow({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <svg viewBox="0 0 240 90" fill="none" aria-hidden="true" className={cn('overflow-visible', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <path
          key={i}
          d={`M0 ${18 + i * 26} C 30 ${6 + i * 26}, 60 ${6 + i * 26}, 90 ${18 + i * 26} S 150 ${30 + i * 26}, 180 ${18 + i * 26} S 225 ${8 + i * 26}, 240 ${14 + i * 26}`}
          stroke="currentColor"
          strokeWidth={2.2 - i * 0.4}
          strokeLinecap="round"
          strokeDasharray="60 180"
          className="motion-safe:animate-[airflow_4.8s_linear_infinite]"
          style={{ animationDelay: `${i * -1.4}s`, opacity: 1 - i * 0.22 }}
        />
      ))}
      <style>{`@keyframes airflow { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}
