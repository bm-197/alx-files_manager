import mongodb from 'mongodb'
import envLoader from './env_loader'

// Represent a MongoDB database client
class DBClient {
   
  // Create a DBClient
  constructo() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABSE || 'file_manager';
  }
}
