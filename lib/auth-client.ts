import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

/** @public */
export const signIn = authClient.signIn;

/** @public */
export const signOut = authClient.signOut;

/** @public */
export const useSession = authClient.useSession;
