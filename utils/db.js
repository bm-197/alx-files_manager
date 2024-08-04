import mongodb from 'mongodb'
import loadEnvVariables from './env_loader.js'

// Represent a MongoDB database client
class DBClient {
   
  // Create a DBClient
  constructor() {
    loadEnvVariables();

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'file_manager';
    const dbURL = `mongodb://${host}:${port}/${database}`;

    this.client = new mongodb.MongoClient(dbURL, { useUnifiedTopology: true });
    this.client.connect();
  }
  
  // Check if client is Connected
  isAlive() {
    return this.client.topology.isConnected();
  }

  // Return the number of users in the database
  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  // Returns the number of files in the database
  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

  // Return a Reference to the user collection.
  async usersCollection() {
    return this.client.db().collection('users');
  }

  // Return a Reference to the file collection. 
  async filesCollection() {
    return this.client.db().collection('files');
  }
}

export const dbClient = new DBClient();
export default dbClient;

