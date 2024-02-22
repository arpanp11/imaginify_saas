import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Cached Mongoose connection object.
 */
let cached: MongooseConnection = (global as any).mongoose;

/**
 * Initialize the cached Mongoose connection object if it does not already exist.
 */
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
  /**
   * Connects to the MongoDB database using the MONGODB_URL environment variable.
   * Checks if a connection is already cached and returns it if so.
   * Otherwise, creates a new connection promise, waits for it to resolve,
   * caches the connection, and returns it.
   */
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URL) {
    throw new Error('Please define the MONGODB_URL environment variable');
  }

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: 'imaginify',
      bufferCommands: false,
    });

  cached.conn = await cached.promise;

  return cached.conn;
};
