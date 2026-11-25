// apps/web/src/components/header.tsx
import { CLINIC_BRAND } from "@/lib/web/constants";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<header className='bg-surface-container-low border-outline-variant/50 sticky top-0 z-50 flex w-full items-center justify-between border-b px-6 py-3'>
			<div className='flex items-center gap-6'>
				<span className='text-primary font-headline text-xl font-bold tracking-tight md:hidden'>
					{CLINIC_BRAND.brandTitleAr}
				</span>
			</div>
			<div className='flex items-center gap-4'>
				<ModeToggle />
				<UserMenu />
			</div>
		</header>
	);
}
