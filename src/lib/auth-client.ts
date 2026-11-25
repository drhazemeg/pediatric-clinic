import type { auth } from './auth';

import {
  adminClient,
  customSessionClient,
  inferAdditionalFields,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { env } from '#/env/web';

import { ac, roles } from './auth/permissions';

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    customSessionClient<typeof auth>(),
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
