import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Use local MongoDB connection by default, fallback to cluster URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

class DatabaseConnection {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    // Different configuration for local vs cluster
    if (uri.includes('mongodb+srv://')) {
      // MongoDB Atlas cluster configuration
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
    } else {
      // Local MongoDB configuration
      this.client = new MongoClient(uri, {
        // Basic options for local MongoDB
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
      });
    }
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(process.env.DB_NAME || 'zuno_school_hub');
      console.log("Successfully connected to MongoDB!");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    await this.client.close();
    this.db = null;
  }

  async ping(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected.');
    }
    await this.db.command({ ping: 1 });
  }
}

const dbConnection = new DatabaseConnection();

export const connectDB = async (): Promise<void> => {
  try {
    await dbConnection.connect();
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    console.log('Server will start without database connection');
    // Don't throw error, allow server to start
  }
};

export const getDB = (): Db => {
  return dbConnection.getDb();
};

export const closeDB = async (): Promise<void> => {
  await dbConnection.close();
};

export default dbConnection;
