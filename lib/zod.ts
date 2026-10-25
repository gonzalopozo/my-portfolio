import { z } from 'zod';

// Configure before constructing schemas: even a caught Function probe reports a CSP violation.
z.config({ jitless: true });

export { z };
