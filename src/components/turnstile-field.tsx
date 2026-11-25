import type {
  TurnstileInstance,
  TurnstileProps,
} from '@marsidev/react-turnstile';

// apps/web/src/components/TurnstileField.tsx
import { Turnstile } from '@marsidev/react-turnstile';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';
import { env } from '@/env/web';

export const TURNSTILE_SITE_KEY = env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;
export const TRUSTED_DEVICE_TOKEN_KEY = 'smart_clinic_trusted_device_token';

const generateDeviceToken = (): string => {
  if ('randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `dev_${Date.now()}`;
};

export const markTrustedClinicDevice = (token?: string): void => {
  if (import.meta.env.SSR) {
    return;
  }

  try {
    const value = token ?? generateDeviceToken();

    window.localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, value);
  } catch {
    // Ignore storage errors in restricted/private mode
  }
};

export const clearTrustedClinicDevice = (): void => {
  if (import.meta.env.SSR) {
    return;
  }

  try {
    window.localStorage.removeItem(TRUSTED_DEVICE_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
};

export const hasTrustedClinicDevice = (): boolean => {
  if (import.meta.env.SSR) {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY);

    return raw !== null && raw.trim().length > 0;
  } catch {
    return false;
  }
};

type TurnstileFieldProps = Omit<TurnstileProps, 'siteKey'> & {
  siteKey?: string;
  /** Optional override to bypass Turnstile on trusted local clinic sessions */
  isTrustedDevice?: boolean;
  ref?: React.Ref<TurnstileInstance | null>;
};

const readNavigatorOnline = (): boolean =>
  import.meta.env.SSR ? true : navigator.onLine;

export const TurnstileField = ({
  options,
  className,
  siteKey,
  isTrustedDevice,
  onError,
  ref,
  ...props
}: TurnstileFieldProps) => {
  const resolvedSiteKey = siteKey ?? TURNSTILE_SITE_KEY;
  const innerRef = useRef<TurnstileInstance | null>(null);

  useImperativeHandle<TurnstileInstance | null, TurnstileInstance | null>(
    ref,
    () => innerRef.current,
    [],
  );

  const trustedDevice = isTrustedDevice ?? hasTrustedClinicDevice();
  const [isOnline, setIsOnline] = useState<boolean>(readNavigatorOnline);
  const [widgetError, setWidgetError] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const retryChallenge = useCallback(() => {
    const onlineNow = readNavigatorOnline();

    setIsOnline(onlineNow);
    setWidgetError(false);
    setRetryNonce((n) => n + 1);
    innerRef.current?.reset();
  }, []);

  useEffect(() => {
    if (import.meta.env.SSR) {
      return () => {
        /* no-op on server */
      };
    }

    const handleOnline = () => {
      setIsOnline(true);
      setWidgetError(false);
      setRetryNonce((n) => n + 1);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mergedOptions = useMemo(
    () => ({ theme: 'auto' as const, size: 'flexible' as const, ...options }),
    [options],
  );

  if (resolvedSiteKey === '' || trustedDevice) {
    return null;
  }

  const showOfflineOrErrorFallback = !isOnline || widgetError;

  return (
    <div className="w-full">
      <div className="flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        {showOfflineOrErrorFallback ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex text-base text-warning">
                <MaterialIcon name={isOnline ? 'refresh' : 'wifi_off'} />
              </span>
              <span>
                {isOnline
                  ? 'تعذر تحميل التحقق الأمني / Security check unavailable'
                  : 'وضع عدم الاتصال — التحقق يتطلب شبكة / Offline: verification requires network'}
              </span>
            </div>
            <Button
              disabled={!isOnline}
              onClick={retryChallenge}
              size="sm"
              type="button"
              variant="outline"
            >
              <span className="me-1 inline-flex text-sm">
                <MaterialIcon name="refresh" />
              </span>
              <span>
                {isOnline
                  ? 'إعادة المحاولة / Retry'
                  : 'إعادة المحاولة عند الاتصال / Retry when online'}
              </span>
            </Button>
          </div>
        ) : (
          <Turnstile
            className={className ?? 'min-h-[65px] w-full [&>iframe]:mx-auto'}
            key={retryNonce}
            onError={(err) => {
              setWidgetError(true);
              onError?.(err);
            }}
            options={mergedOptions}
            ref={innerRef}
            siteKey={resolvedSiteKey ?? ''}
            {...props}
          />
        )}
      </div>
    </div>
  );
};
