import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-aegis-blue/60 focus:ring-2 focus:ring-aegis-blue/25',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
