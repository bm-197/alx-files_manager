import redisClient from "../utils/redis.js"
import { v4 as uuiddv4 } from 'uuid';

export default class AuthController {
  static async getConnect(req, res) {
    const token = uuiddv4();
    const { user } = req;
    
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
    res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}