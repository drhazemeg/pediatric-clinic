// apps/web/src/components/sidebar.tsx

import {Link, useLocation, useNavigate} from "@tanstack/react-router";
import {useState} from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import {useQueueCounts} from "@/hooks/use-clinic-store";
import {useSidebar} from "@/hooks/use-sidebar";
import {images} from "@/lib/web/app-images";
import {authClient} from "@/lib/auth-client";
import {CLINIC_BRAND} from "@/lib/web/constants";

interface NavItem {
	to: string;
	label: string;
	icon: string;
	search?: Record<string, string>;
}

interface NavGroup {
	label?: string;
	items: NavItem[];
}

const navGroups: NavGroup[] = [
	{
		items: [
			{ to: "/dashboard", label: "Dashboard", icon: "dashboard" },
			{ to: "/queue", label: "Clinic Queue", icon: "group" },
			{ to: "/appointments", label: "Appointments", icon: "calendar_today" }
		]
	},
	{
		label: "Clinical Care",
		items: [
			{ to: "/patients", label: "Patients", icon: "child_care" },
			{ to: "/prescriptions", label: "Prescriptions", icon: "medication" },
			{ to: "/growth", label: "Growth Charts", icon: "show_chart" },
			{ to: "/immunizations", label: "Immunizations", icon: "vaccines" }
		]
	},
	{
		label: "Operations",
		items: [
			{ to: "/finance", label: "Finance & Billing", icon: "payments" },
			{ to: "/jobs", label: "AI & Background Jobs", icon: "auto_awesome" }
		]
	}
];

const bottomItems: NavItem[] = [
	{ to: "/settings", label: "Settings", icon: "settings" }
];

const mobileNavItems: NavItem[] = [
	{ to: "/dashboard", label: "Dashboard", icon: "dashboard" },
	{ to: "/queue", label: "Queue", icon: "group" },
	{ to: "/appointments", label: "Appts", icon: "calendar_today" },
	{ to: "/patients", label: "Patients", icon: "child_care" }
];

function NavIcon({ name }: { name: string }) {
	return (
		<span className='material-symbols-outlined w-6 text-center text-xl'>
			{name}
		</span>
	);
}
function NavLink({
	item,
	isActive,
	collapsed,
	badge
}: {
	item: NavItem;
	isActive: boolean;
	collapsed: boolean;
	badge?: number;
}) {
	return (
		<Link
			aria-current={isActive ? "page" : undefined}
			className={`group clay-hover flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] transition-all ${
				isActive
					? "clay-shadow bg-[var(--matcha-300)] font-semibold text-[var(--matcha-800)]"
					: "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
			} ${collapsed ? "justify-center px-2 py-3" : "px-3 py-3"}`}
			search={item.search as Record<string, string> | undefined}
			title={collapsed ? item.label : undefined}
			to={item.to}
		>
			<NavIcon name={item.icon} />
			{!collapsed && (
				<span className='flex-1 text-sm font-medium'>{item.label}</span>
			)}
			{!collapsed && badge !== undefined && (
				<span className='rounded-full bg-[var(--pomegranate-400)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--pure-white)]'>
					{badge}
				</span>
			)}
		</Link>
	);
}

export function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const { collapsed, toggle } = useSidebar();
	const { data: session } = authClient.useSession();
	const isLoggedIn = !!session;
	const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
	const { waiting } = useQueueCounts();
	const isAdmin = session?.user?.role === "admin";

	async function handleSignOut() {
		await authClient.signOut();
		navigate({ to: "/" });
	}

	return (
		<>
			<aside
				className={`fixed top-0 left-0 z-40 hidden h-full flex-col overflow-y-auto border-r border-[var(--oat-border)] bg-[var(--warm-cream)] transition-all duration-300 md:flex ${
					collapsed ? "w-16 items-center px-2 py-4" : "w-64 px-3 py-4"
				}`}
			>
				<div className={`mb-6 ${collapsed ? "px-0 text-center" : "px-3"}`}>
					<img
						alt={images.logo.altEn}
						className='mt-2 size-14 object-contain select-none'
						decoding='async'
						height={56}
						src={images.logo.src}
						width={56}
					/>
					{!collapsed && (
						<div className='mt-2'>
							<p className='text-xs font-bold tracking-wider text-[var(--clay-black)]'>
								{CLINIC_BRAND.brandTitleAr}
							</p>
							<p className='text-[10px] text-[var(--warm-charcoal)]'>
								{CLINIC_BRAND.cityEn}
							</p>
						</div>
					)}
				</div>

				<nav className='w-full flex-1 space-y-4'>
					{navGroups.map(group => (
						<div
							className='space-y-1'
							key={group.label ?? "ungrouped"}
						>
							{!collapsed && group.label && (
								<p className='px-3 text-[10px] font-bold tracking-wider text-[var(--warm-charcoal)]/60 uppercase'>
									{group.label}
								</p>
							)}
							{group.items.map(item => {
								const isActive =
									location.pathname === item.to ||
									(location.pathname.startsWith(`${item.to}/`) &&
										item.to !== "/");
								return (
									<NavLink
										badge={
											item.to === "/queue" && waiting > 0 ? waiting : undefined
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
						<div className='space-y-1 border-t border-[var(--matcha-400)]/30 pt-2'>
							{!collapsed && (
								<p className='px-3 text-[10px] font-bold tracking-wider text-[var(--matcha-600)] uppercase'>
									Admin
								</p>
							)}
							<NavLink
								collapsed={collapsed}
								isActive={location.pathname === "/jobs"}
								item={{ to: "/jobs", label: "System Jobs", icon: "task" }}
							/>
						</div>
					)}
				</nav>

				<div className='mt-auto w-full space-y-1 border-t border-[var(--oat-border)] pt-4'>
					{bottomItems.map(item => {
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
							aria-label='Sign Out'
							className={`clay-hover flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] ${
								collapsed ? "justify-center px-2 py-3" : "px-3 py-3 text-left"
							}`}
							onClick={handleSignOut}
							title={collapsed ? "Sign Out" : undefined}
							type='button'
						>
							<NavIcon name='logout' />
							{!collapsed && (
								<span className='text-sm font-medium'>Sign Out</span>
							)}
						</button>
					) : (
						<Link
							className={`clay-hover flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)] ${
								collapsed ? "justify-center px-2 py-3" : "px-3 py-3"
							}`}
							title={collapsed ? "Sign In" : undefined}
							to='/login'
						>
							<NavIcon name='login' />
							{!collapsed && (
								<span className='text-sm font-medium'>Sign In</span>
							)}
						</Link>
					)}
				</div>
			</aside>

			<button
				aria-expanded={!collapsed}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				className='clay-hover fixed top-6 z-40 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--oat-border)] bg-[var(--pure-white)] text-[var(--warm-charcoal)] shadow-md transition-all duration-300 hover:bg-[var(--oat-light)] md:flex'
				onClick={toggle}
				style={{ left: collapsed ? "48px" : "240px" }}
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				type='button'
			>
				<span className='material-symbols-outlined text-[20px]'>
					{collapsed ? "right_panel_open" : "right_panel_close"}
				</span>
			</button>

			<nav className='fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[var(--radius-xl)] border-t border-[var(--oat-border)] bg-[var(--warm-cream)]/90 px-2 pt-3 pb-6 backdrop-blur-xl md:hidden'>
				{mobileNavItems.map(item => {
					const isActive = location.pathname === item.to;
					return (
						<Link
							aria-current={isActive ? "page" : undefined}
							className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] px-3 py-1.5 transition-all ${
								isActive
									? "bg-[var(--matcha-300)] text-[var(--matcha-800)]"
									: "text-[var(--warm-charcoal)]"
							}`}
							key={item.to}
							to={item.to}
						>
							<NavIcon name={item.icon} />
							<span className='mt-1 text-[10px] font-medium tracking-wider uppercase'>
								{item.label}
							</span>
						</Link>
					);
				})}
				<button
					aria-label='More menu'
					className='flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] px-3 py-1.5 text-[var(--warm-charcoal)] transition-all'
					onClick={() => setMobileSheetOpen(true)}
					type='button'
				>
					<NavIcon name='menu' />
					<span className='mt-1 text-[10px] font-medium tracking-wider uppercase'>
						More
					</span>
				</button>
			</nav>

			<Sheet
				onOpenChange={setMobileSheetOpen}
				open={mobileSheetOpen}
			>
				<SheetContent
					className='max-h-[80vh] overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--warm-cream)] px-4 pt-2 pb-10'
					side='bottom'
				>
					<SheetHeader className='px-2 pt-2 pb-3'>
						<SheetTitle className='font-headline text-sm font-bold text-[var(--clay-black)]'>
							Clinic Navigation
						</SheetTitle>
					</SheetHeader>
					<div className='space-y-4'>
						{navGroups.map(group => (
							<div
								className='space-y-1'
								key={group.label ?? "ungrouped"}
							>
								{group.label && (
									<p className='px-3 text-[10px] font-bold tracking-wider text-[var(--warm-charcoal)]/50 uppercase'>
										{group.label}
									</p>
								)}
								{group.items.map(item => {
									const isActive = location.pathname === item.to;
									return (
										<Link
											className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] px-3 py-3 transition-all ${
												isActive
													? "bg-[var(--matcha-300)] font-semibold text-[var(--matcha-800)]"
													: "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
											}`}
											key={item.to}
											onClick={() => setMobileSheetOpen(false)}
											to={item.to}
										>
											<NavIcon name={item.icon} />
											<span className='text-sm font-medium'>{item.label}</span>
										</Link>
									);
								})}
							</div>
						))}

						{isAdmin && (
							<div className='space-y-1 border-t border-[var(--matcha-400)]/30 pt-2'>
								<p className='px-3 text-[10px] font-bold tracking-wider text-[var(--matcha-600)] uppercase'>
									Admin
								</p>
								<Link
									className='flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] px-3 py-3 text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]'
									onClick={() => setMobileSheetOpen(false)}
									to='/jobs'
								>
									<NavIcon name='task' />
									<span className='text-sm font-medium'>System Jobs</span>
								</Link>
							</div>
						)}

						<div className='space-y-1 border-t border-[var(--oat-border)] pt-2'>
							{bottomItems.map(item => {
								const isActive = location.pathname === item.to;
								return (
									<Link
										className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] px-3 py-3 transition-all ${
											isActive
												? "bg-[var(--matcha-300)] font-semibold text-[var(--matcha-800)]"
												: "text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]"
										}`}
										key={item.to}
										onClick={() => setMobileSheetOpen(false)}
										to={item.to}
									>
										<NavIcon name={item.icon} />
										<span className='text-sm font-medium'>{item.label}</span>
									</Link>
								);
							})}
						</div>

						<div className='border-t border-[var(--oat-border)] pt-2'>
							{isLoggedIn ? (
								<button
									className='flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] px-3 py-3 text-left text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]'
									onClick={() => {
										handleSignOut();
										setMobileSheetOpen(false);
									}}
									type='button'
								>
									<NavIcon name='logout' />
									<span className='text-sm font-medium'>Sign Out</span>
								</button>
							) : (
								<Link
									className='flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] px-3 py-3 text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] hover:text-[var(--clay-black)]'
									onClick={() => setMobileSheetOpen(false)}
									to='/login'
								>
									<NavIcon name='login' />
									<span className='text-sm font-medium'>Sign In</span>
								</Link>
							)}
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
