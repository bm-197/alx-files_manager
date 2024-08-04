import { createClient } from 'redis';
import { promisify } from 'util';

// a redis client
class RedisClient {
  
  // create a redisclient
  constructor() {
    this.client = createClient();
    this.isconnected = true;
    this.client.on('error', (err) => {
      console.log('redis client failed to connect', err);
      this.isconnected = false;
    })
    this.client.on('connect', () => this.isconnected = true);
  }
  
  // check if client is connected to redis.
  isAlive() {
    return this.isconnected;
  }

  // returns a redis value store for the passed key. 
  async get(key) {
    const value = await promisify(this.client.GET).bind(this.client)(key);
    return value;
  }

  // Sets a key to a value, with and expiration.
  async set(key, value, duration) {
    await promisify(this.client.SETEX).bind(this.client)(key, duration, value);
  }
  // Delete a key 
  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;

