// apps/web/src/components/TurnstileField.tsx
import {
    Turnstile,
    type TurnstileInstance,
    type TurnstileProps
} from "@marsidev/react-turnstile";
import {env} from "@/env/web";
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState
} from "react";
import {Button} from "@/components/ui/button";
import {MaterialIcon} from "@/components/ui/MaterialIcon";

export const TURNSTILE_SITE_KEY = env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;
export const TRUSTED_DEVICE_TOKEN_KEY = "smart_clinic_trusted_device_token";

export function markTrustedClinicDevice(token?: string): void {
	if (typeof window === "undefined") return;
	try {
		const value =
			token ??
			(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `dev_${Date.now()}`);
		window.localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, value);
	} catch {
		// Ignore storage errors in restricted/private mode
	}
}

export function clearTrustedClinicDevice(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(TRUSTED_DEVICE_TOKEN_KEY);
	} catch {
		// Ignore storage errors
	}
}

export function hasTrustedClinicDevice(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const raw = window.localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY);
		return typeof raw === "string" && raw.trim().length > 0;
	} catch {
		return false;
	}
}

type TurnstileFieldProps = Omit<TurnstileProps, "siteKey"> & {
	siteKey?: string;
	/** Optional override to bypass Turnstile on trusted local clinic sessions */
	isTrustedDevice?: boolean;
};

export const TurnstileField = forwardRef<
	TurnstileInstance,
	TurnstileFieldProps
>(function TurnstileField(
	{ options, className, siteKey, isTrustedDevice, onError, ...props },
	ref
) {
	const resolvedSiteKey = siteKey ?? TURNSTILE_SITE_KEY;
	const innerRef = useRef<TurnstileInstance | null>(null);

	useImperativeHandle(ref, () => innerRef.current as TurnstileInstance, []);

	const [trustedDevice] = useState<boolean>(
		() => isTrustedDevice ?? hasTrustedClinicDevice()
	);
	const [isOnline, setIsOnline] = useState<boolean>(() =>
		typeof navigator !== "undefined" ? navigator.onLine : true
	);
	const [widgetError, setWidgetError] = useState<boolean>(false);
	const [retryNonce, setRetryNonce] = useState<number>(0);

	const retryChallenge = useCallback(() => {
		const onlineNow =
			typeof navigator !== "undefined" ? navigator.onLine : true;
		setIsOnline(onlineNow);
		setWidgetError(false);
		setRetryNonce(n => n + 1);
		innerRef.current?.reset?.();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleOnline = () => {
			setIsOnline(true);
			setWidgetError(false);
			setRetryNonce(n => n + 1);
		};
		const handleOffline = () => {
			setIsOnline(false);
		};
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	if (!resolvedSiteKey || trustedDevice) return null;

	const showOfflineOrErrorFallback = !isOnline || widgetError;

	return (
		<div className='w-full'>
			<div className='bg-muted/40 flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--oat-border)] px-3 py-2.5'>
				{showOfflineOrErrorFallback ? (
					<div className='flex w-full flex-wrap items-center justify-between gap-2 text-xs text-[var(--warm-charcoal)]'>
						<div className='flex items-center gap-2'>
							<MaterialIcon
								className='text-base text-amber-600'
								name={isOnline ? "refresh" : "wifi_off"}
							/>
							<span>
								{isOnline
									? "تعذر تحميل التحقق الأمني / Security check unavailable"
									: "وضع عدم الاتصال — التحقق يتطلب شبكة / Offline: verification requires network"}
							</span>
						</div>
						<Button
							className='h-7 gap-1 px-2.5 text-xs'
							disabled={!isOnline}
							onClick={retryChallenge}
							size='sm'
							type='button'
							variant='outline'
						>
							<MaterialIcon
								className='text-sm'
								name='refresh'
							/>
							<span>
								{isOnline
									? "إعادة المحاولة / Retry"
									: "إعادة المحاولة عند الاتصال / Retry when online"}
							</span>
						</Button>
					</div>
				) : (
					<Turnstile
						className={className ?? "min-h-[65px] w-full [&>iframe]:mx-auto"}
						key={retryNonce}
						onError={err => {
							setWidgetError(true);
							onError?.(err);
						}}
						options={{ theme: "auto", size: "flexible", ...options }}
						ref={innerRef}
						siteKey={resolvedSiteKey}
						{...props}
					/>
				)}
			</div>
		</div>
	);
});
