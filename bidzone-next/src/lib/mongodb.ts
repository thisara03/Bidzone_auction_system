import mongoose from "mongoose";
import { assertMongoEnv, getMongoUri } from "@/lib/env";

/**
 * Cached connection to avoid opening multiple connections during
 * Next.js hot-reloads in development.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  assertMongoEnv();

  if (!cached.promise) {
    const uri = getMongoUri()!;
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8_000,
        connectTimeoutMS: 8_000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function isDbConnectionError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'MongooseServerSelectionError' || err.name === 'MongoServerSelectionError')
  )
}

export default connectToDatabase;
