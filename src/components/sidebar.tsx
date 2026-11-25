// apps/web/src/components/sidebar.tsx

import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useQueueCounts } from '@/hooks/use-clinic-store';
import { useSidebar } from '@/hooks/use-sidebar';
import { authClient } from '@/lib/auth-client';
import { images } from '@/lib/web/app-images';
import { CLINIC_BRAND } from '@/lib/web/constants';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  search?: Record<string, string>;
}

interface NavGroup {
  label?: string;
  items: Array<NavItem>;
}

const navGroups: Array<NavGroup> = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/queue', label: 'Clinic Queue', icon: 'group' },
      { to: '/appointments', label: 'Appointments', icon: 'calendar_today' },
    ],
  },
  {
    label: 'Clinical Care',
    items: [
      { to: '/patients', label: 'Patients', icon: 'child_care' },
      { to: '/prescriptions', label: 'Prescriptions', icon: 'medication' },
      { to: '/growth', label: 'Growth Charts', icon: 'show_chart' },
      { to: '/immunizations', label: 'Immunizations', icon: 'vaccines' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/finance', label: 'Finance & Billing', icon: 'payments' },
      { to: '/jobs', label: 'AI & Background Jobs', icon: 'auto_awesome' },
    ],
  },
];

const bottomItems: Array<NavItem> = [
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const mobileNavItems: Array<NavItem> = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/queue', label: 'Queue', icon: 'group' },
  { to: '/appointments', label: 'Appts', icon: 'calendar_today' },
  { to: '/patients', label: 'Patients', icon: 'child_care' },
];

const adminJobsNavItem: NavItem = {
  to: '/jobs',
  label: 'System Jobs',
  icon: 'task',
};

const NavIcon = ({ name }: { name: string }) => (
  <span className="material-symbols-outlined w-6 text-center text-xl">
    {name}
  </span>
);

const NavLink = ({
  item,
  isActive,
  collapsed,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}) => (
  <Link
    aria-current={isActive ? 'page' : undefined}
    className={`group flex cursor-pointer items-center gap-3 rounded-lg transition-all hover:shadow-sm ${
      isActive
        ? 'bg-accent font-semibold text-accent-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    } ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-3'}`}
    search={item.search}
    title={collapsed ? item.label : undefined}
    to={item.to}
  >
    <NavIcon name={item.icon} />
    {!collapsed && (
      <span className="flex-1 text-sm font-medium">{item.label}</span>
    )}
    {!collapsed && badge !== undefined && (
      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
        {badge}
      </span>
    )}
  </Link>
);

const MobileSidebarSheet = ({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  isLoggedIn,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  pathname: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  onSignOut: () => Promise<void>;
}) => (
  <Sheet onOpenChange={onOpenChange} open={open}>
    <SheetContent side="bottom">
      <div className="max-h-screen overflow-y-auto rounded-t-xl bg-background px-4 pt-2 pb-10">
        <SheetHeader>
          <SheetTitle>Clinic Navigation</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4">
          {navGroups.map((group) => (
            <div className="space-y-1" key={group.label ?? 'ungrouped'}>
              {group.label !== undefined && group.label !== '' && (
                <p className="px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.to;

                return (
                  <Link
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                      isActive
                        ? 'bg-accent font-semibold text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    key={item.to}
                    onClick={() => onOpenChange(false)}
                    to={item.to}
                  >
                    <NavIcon name={item.icon} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="space-y-1 border-t border-primary/30 pt-2">
              <p className="px-3 text-xs font-bold tracking-wider text-primary uppercase">
                Admin
              </p>
              <Link
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                onClick={() => onOpenChange(false)}
                to="/jobs"
              >
                <NavIcon name="task" />
                <span className="text-sm font-medium">System Jobs</span>
              </Link>
            </div>
          )}

          <div className="space-y-1 border-t border-border pt-2">
            {bottomItems.map((item) => {
              const isActive = pathname === item.to;

              return (
                <Link
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                    isActive
                      ? 'bg-accent font-semibold text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  key={item.to}
                  onClick={() => onOpenChange(false)}
                  to={item.to}
                >
                  <NavIcon name={item.icon} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border pt-2">
            {isLoggedIn ? (
              <button
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                onClick={() => {
                  onSignOut().catch(() => null);
                  onOpenChange(false);
                }}
                type="button"
              >
                <NavIcon name="logout" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            ) : (
              <Link
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                onClick={() => onOpenChange(false)}
                to="/login"
              >
                <NavIcon name="login" />
                <span className="text-sm font-medium">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
);

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const { data: session } = authClient.useSession();
  const isLoggedIn = Boolean(session);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { waiting } = useQueueCounts();
  const isAdmin = session?.user.role === 'admin';

  const handleSignOut = async (): Promise<void> => {
    await authClient.signOut();
    await navigate({ to: '/' });
  };

  return (
    <>
      <aside
        className={`fixed top-0 left-0 z-40 hidden h-full flex-col overflow-y-auto border-r border-border bg-background transition-all duration-300 md:flex ${
          collapsed ? 'w-16 items-center px-2 py-4' : 'w-64 px-3 py-4'
        }`}
      >
        <div className={`mb-6 ${collapsed ? 'px-0 text-center' : 'px-3'}`}>
          <img
            alt={images.logo.altEn}
            className="mt-2 size-14 object-contain select-none"
            decoding="async"
            height={56}
            src={images.logo.src}
            width={56}
          />
          {!collapsed && (
            <div className="mt-2">
              <p className="text-xs font-bold tracking-wider text-foreground">
                {CLINIC_BRAND.brandTitleAr}
              </p>
              <p className="text-xs text-muted-foreground">
                {CLINIC_BRAND.cityEn}
              </p>
            </div>
          )}
        </div>

        <nav className="w-full flex-1 space-y-4">
          {navGroups.map((group) => (
            <div className="space-y-1" key={group.label ?? 'ungrouped'}>
              {!collapsed &&
                group.label !== undefined &&
                group.label !== '' && (
                  <p className="px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    {group.label}
                  </p>
                )}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (location.pathname.startsWith(`${item.to}/`) &&
                    item.to !== '/');

                return (
                  <NavLink
                    badge={
                      item.to === '/queue' && waiting > 0 ? waiting : undefined
                    }
                    collapsed={collapsed}
                    isActive={isActive}
                    item={item}
                    key={item.to}
                  />
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="space-y-1 border-t border-primary/30 pt-2">
              {!collapsed && (
                <p className="px-3 text-xs font-bold tracking-wider text-primary uppercase">
                  Admin
                </p>
              )}
              <NavLink
                collapsed={collapsed}
                isActive={location.pathname === '/jobs'}
                item={adminJobsNavItem}
              />
            </div>
          )}
        </nav>

        <div className="mt-auto w-full space-y-1 border-t border-border pt-4">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                collapsed={collapsed}
                isActive={isActive}
                item={item}
                key={item.to}
              />
            );
          })}

          {isLoggedIn ? (
            <button
              aria-label="Sign Out"
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:shadow-sm ${
                collapsed ? 'justify-center px-2 py-3' : 'px-3 py-3 text-left'
              }`}
              onClick={() => {
                handleSignOut().catch(() => null);
              }}
              title={collapsed ? 'Sign Out' : undefined}
              type="button"
            >
              <NavIcon name="logout" />
              {!collapsed && (
                <span className="text-sm font-medium">Sign Out</span>
              )}
            </button>
          ) : (
            <Link
              className={`flex cursor-pointer items-center gap-3 rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:shadow-sm ${
                collapsed ? 'justify-center px-2 py-3' : 'px-3 py-3'
              }`}
              title={collapsed ? 'Sign In' : undefined}
              to="/login"
            >
              <NavIcon name="login" />
              {!collapsed && (
                <span className="text-sm font-medium">Sign In</span>
              )}
            </Link>
          )}
        </div>
      </aside>

      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`fixed top-6 z-40 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-md transition-all duration-300 hover:bg-muted hover:shadow-sm md:flex ${
          collapsed ? 'left-12' : 'left-60'
        }`}
        onClick={toggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">
          {collapsed ? 'right_panel_open' : 'right_panel_close'}
        </span>
      </button>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-border bg-background/90 px-2 pt-3 pb-6 backdrop-blur-xl md:hidden">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.to;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg px-3 py-1.5 transition-all ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
              key={item.to}
              to={item.to}
            >
              <NavIcon name={item.icon} />
              <span className="mt-1 text-xs font-medium tracking-wider uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          aria-label="More menu"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg px-3 py-1.5 text-muted-foreground transition-all"
          onClick={() => setMobileSheetOpen(true)}
          type="button"
        >
          <NavIcon name="menu" />
          <span className="mt-1 text-xs font-medium tracking-wider uppercase">
            More
          </span>
        </button>
      </nav>

      <MobileSidebarSheet
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
        onOpenChange={setMobileSheetOpen}
        onSignOut={handleSignOut}
        open={mobileSheetOpen}
        pathname={location.pathname}
      />
    </>
  );
}
