import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,

        bufferMaxEntries: 0,
        bufferCommands: false,

        heartbeatFrequencyMS: 10000,

        authSource: "admin",
      };

      this.connection = await mongoose.connect(
        process.env.MONGODB_URI,
        options
      );
      this.isConnected = true;

      console.log("Connected to MongoDB successfully");
      console.log(` Database : ${this.connection.connection.db.databaseName}`);
      console.log(
        `Host : ${this.connection.connection.host}:${this.connection.connection.port}`
      );

      this.setupEventListeners();

      return this.connection;
    } catch (error) {
      console.error("MongoDB connection error:", error);
      this.isConnected = false;
      throw error;
    }
  }

  setupEventListeners() {
    const { connection } = mongoose;

    connection.on("connected", () => {
      console.log("Mongoose connected to MongoDB");
      this.isConnected = true;
    });

    connection.on("error", (error) => {
      console.log("Mongoose connection error:", error);
      this.isConnected = false;
    });

    connection.on("disconnected", () => {
      console.log("Mongoose disconnected from MongoDB");
      this.isConnected = false;
    });

    connection.on("reconnected", () => {
      console.log("🔄 Mongoose reconnected to MongoDB");
      this.isConnected = true;
    });

    connection.on("timeout", () => {
      console.log("⏰ Mongoose connection timeout");
    });

    connection.on("close", () => {
      console.log("🔒 Mongoose connection closed");
      this.isConnected = false;
    });
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log("Disconnected from MongoDB");
      }
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error);
    }
  }

  async isHealthy() {
    try {
      if (!this.isConnected) {
        return false;
      }

      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();

      return result.ok === 1;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections),
    };
  }

  async getStats() {
    try {
      if (!this.isConnected) {
        return null;
      }

      const db = mongoose.connection.db;
      const admin = db.admin();

      const [dbStats, serverStatus] = await Promise.all([
        db.stats(),
        admin.serverStatus(),
      ]);

      return {
        database: {
          name: db.databaseName,
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
        },
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem,
          network: serverStatus.network,
        },
      };
    } catch (error) {
      console.error("❌ Error getting database stats:", error);
      return null;
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup() {
    try {
      console.log("🧹 Cleaning up database connections...");

      // Clean up expired tokens
      const User = mongoose.model("User");
      await User.cleanExpiredTokens();

      // Disconnect from database
      await this.disconnect();

      console.log("✅ Database cleanup completed");
    } catch (error) {
      console.error("❌ Error during database cleanup:", error);
    }
  }
}

// Create singleton instance
const database = new DatabaseConnection();

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  await database.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  await database.cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("❌ Uncaught Exception:", error);
  await database.cleanup();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  await database.cleanup();
  process.exit(1);
});

export default database;
