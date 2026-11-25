// src/integrations/better-auth/header-user.tsx
import { authClient } from '#/lib/auth-client';

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <output
        aria-label="Loading account"
        className="h-8 w-8 animate-pulse rounded bg-muted"
      />
    );
  }

  if (session?.user === undefined) {
    return null;
  }

  const { user } = session;
  const { image, name } = user;
  const initial = name.length > 0 ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex items-center gap-2">
      {image !== null && image !== undefined && image !== '' ? (
        <img
          alt={`${name} avatar`}
          className="h-8 w-8 rounded-full object-cover"
          src={image}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <span className="text-xs font-medium text-muted-foreground">
            {initial}
          </span>
        </div>
      )}
      <button
        className="h-9 flex-1 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          void authClient.signOut();
        }}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
