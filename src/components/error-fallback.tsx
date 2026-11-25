// apps/web/src/components/ErrorFallback.tsx

import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';

export const ErrorFallback = ({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) => {
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    navigate({ to: '/dashboard' }).catch(() => null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <span className="inline-flex text-3xl text-destructive">
            <MaterialIcon name="error" />
          </span>
        </div>
        <h1 className="mb-2 font-heading text-xl font-bold text-foreground">
          حدث خطأ غير متوقع / Unexpected Error
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          تعذر تحميل الصفحة. حاول مرة أخرى أو ارجع إلى لوحة العيادة. / Please
          try again or return to the clinic dashboard.
        </p>
        {import.meta.env.DEV && error.message !== '' && (
          <pre className="mb-6 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-foreground">
            {error.message}
          </pre>
        )}
        <div className="flex justify-center gap-3">
          {reset !== undefined && (
            <Button onClick={reset} type="button" variant="outline">
              إعادة المحاولة / Retry
            </Button>
          )}
          <Button onClick={handleGoDashboard} type="button">
            لوحة العيادة / Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
