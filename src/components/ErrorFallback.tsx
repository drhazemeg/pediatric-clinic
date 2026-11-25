// apps/web/src/components/ErrorFallback.tsx

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ErrorFallback({
	error,
	reset
}: {
	error: Error;
	reset?: () => void;
}) {
	const navigate = useNavigate();

	const handleGoDashboard = () => {
		void navigate({ to: "/dashboard" });
	};

	return (
		<div className='flex min-h-screen items-center justify-center bg-[var(--warm-cream)] px-4'>
			<div className='w-full max-w-md rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] p-8 text-center shadow-xl'>
				<div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--pomegranate-400)]/20'>
					<span className='material-symbols-outlined text-3xl text-[var(--pomegranate-400)]'>
						error
					</span>
				</div>
				<h1 className='font-headline mb-2 text-xl font-bold text-[var(--clay-black)]'>
					حدث خطأ غير متوقع / Unexpected Error
				</h1>
				<p className='mb-6 text-sm text-[var(--warm-charcoal)]'>
					تعذر تحميل الصفحة. حاول مرة أخرى أو ارجع إلى لوحة العيادة. / Please
					try again or return to the clinic dashboard.
				</p>
				{import.meta.env.DEV && error.message && (
					<pre className='mb-6 overflow-auto rounded-[var(--radius-md)] bg-[var(--oat-light)] p-3 text-left text-xs text-[var(--clay-black)]'>
						{error.message}
					</pre>
				)}
				<div className='flex justify-center gap-3'>
					{reset && (
						<Button
							className='rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)]'
							onClick={reset}
							type='button'
							variant='outline'
						>
							إعادة المحاولة / Retry
						</Button>
					)}
					<Button
						className='rounded-[var(--radius-lg)] bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]'
						onClick={handleGoDashboard}
						type='button'
					>
						لوحة العيادة / Dashboard
					</Button>
				</div>
			</div>
		</div>
	);
}
