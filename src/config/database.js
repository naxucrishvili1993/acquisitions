import 'dotenv/config';

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

let db, sql;

// Check if we're using Neon Local (development) or Neon Cloud (production)
const isNeonLocal = process.env.DATABASE_URL?.includes('neon-local') || 
                    process.env.NODE_ENV === 'development' && 
                    !process.env.DATABASE_URL?.includes('neon.tech');

if (isNeonLocal) {
  // Use standard postgres driver for Neon Local
  console.log('🔧 Using postgres driver for Neon Local development');
  
  // Configure postgres client
  sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : 'prefer',
    max: 10,
    transform: {
      undefined: null,
    },
  });
  
  db = drizzlePostgres(sql);
} else {
  // Use Neon serverless driver for production
  console.log('☁️ Using Neon serverless driver for production');
  
  // Configure Neon serverless for HTTP-only communication (required for Neon Local)
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT || undefined;
  
  sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql);
}

export { db, sql };
