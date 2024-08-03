import { createClient } from 'redis';
import { promisify } from 'util';

// A Redis Client
class RedisClient {
  
  // Create a RedisClient
  constructor() {
    this.client = createClient();
    this.isConnected = true;
    this.client.on('error', (err) => {
      consol.log('Redis Client failed to connect', err));
      isConnected = false;
    }
    this.client.on('connect', () => isConnected = true);
  }
  
  // Check if client is connected to redis.
  isValid() {
    return isConnected;
  }

  // Returns a Redis value store for the passed key. 
  async get(key) {
    const value = await promisify(this.client.GET).bind(this.client);
    return value;
  }

  // Sets a key to a value, with and expiration.
  async set(key, value, duration) {
    await promisify(client.SET).bind(client)(key, value, {
      EX: duration, 
    });
  }

  // Delete a key 
  async del(key) {
    await promisify(client.DEL).bind(client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;

