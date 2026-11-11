'use client';

import { Tooltip as T } from 'radix-ui';
import type { ReactNode } from 'react';

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-[95] max-w-[260px] rounded-md bg-navy-950 px-2.5 py-1.5 text-[12px] font-medium leading-snug text-porcelain shadow-pop data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          <T.Arrow className="fill-navy-950" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
