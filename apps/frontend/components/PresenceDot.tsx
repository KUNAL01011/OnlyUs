import { cn } from '@/lib/utils';

export function PresenceDot({
  online,
  label,
  className,
}: {
  online: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className="relative flex h-2.5 w-2.5">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2.5 w-2.5 rounded-full',
            online ? 'bg-emerald-400' : 'bg-muted-foreground/50'
          )}
        />
      </span>
      {label && (
        <span className={online ? 'text-emerald-400' : 'text-muted-foreground'}>
          {label}
        </span>
      )}
    </span>
  );
}
