import { cn } from '@/lib/utils';

export function Switch({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'aegis-switch relative h-7 w-12 rounded-full border border-white/10 transition-colors duration-300 ease-out',
        checked ? 'bg-aegis-signin' : 'bg-white/10',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'aegis-switch-thumb absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-out',
          checked ? 'left-5' : 'left-0.5'
        )}
      />
    </button>
  );
}
