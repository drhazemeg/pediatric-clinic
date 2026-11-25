// apps/web/src/components/header.tsx
import { CLINIC_BRAND } from '@/lib/web/constants';

import { ModeToggle } from './mode-toggle';
import UserMenu from './user-menu';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border/50 bg-card px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-heading text-xl font-bold tracking-tight text-primary md:hidden">
          {CLINIC_BRAND.brandTitleAr}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
