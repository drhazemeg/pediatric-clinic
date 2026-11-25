import type * as React from 'react';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from 'cn';

function Avatar({
  className,
  size = 'default',
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten',
        className,
      )}
      data-size={size}
      data-slot="avatar"
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      className={cn(
        'aspect-square size-full rounded-full object-cover',
        className,
      )}
      data-slot="avatar-image"
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-sm group-data-[size=sm]/avatar:text-xs',
        className,
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'absolute end-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none',
        'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
        'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
        'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        className,
      )}
      data-slot="avatar-badge"
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        className,
      )}
      data-slot="avatar-group"
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        className,
      )}
      data-slot="avatar-group-count"
      {...props}
    />
  );
}

const sizeClasses = {
  xs: { container: 'h-6 w-6', text: 'text-xs' },
  sm: { container: 'h-8 w-8', text: 'text-sm' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-16 w-16', text: 'text-xl' },
  xl: { container: 'h-16 w-16 md:h-20 md:w-20', text: 'text-2xl md:text-3xl' },
} as const;

const variantClasses = {
  profile: 'bg-[var(--matcha-300)] text-[var(--matcha-800)]',
  leaderboard: 'bg-[var(--oat-light)] text-[var(--warm-charcoal)]',
} as const;

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
  bordered?: boolean;
  className?: string;
}

export function Avatary({
  src,
  name,
  size = 'md',
  variant = 'profile',
  bordered = false,
  className,
}: AvatarProps) {
  const sizes = sizeClasses[size];
  const borderClass = bordered
    ? 'border-4 border-[var(--pure-white)] clay-shadow'
    : '';
  const initial = (name?.[0] ?? '?').toUpperCase();

  if (src) {
    return (
      <img
        alt={name}
        className={cn(
          sizes.container,
          'shrink-0 rounded-full object-cover',
          borderClass,
          className,
        )}
        src={src}
      />
    );
  }

  return (
    <div
      className={cn(
        sizes.container,
        'flex shrink-0 items-center justify-center rounded-full',
        variantClasses[variant],
        borderClass,
        className,
      )}
    >
      <span className={cn(sizes.text, 'font-headline font-bold')}>
        {initial}
      </span>
    </div>
  );
}

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
};
