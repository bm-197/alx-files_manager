import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";
import mongoDBCore from 'mongodb/lib/core/index.js';
import sha1 from "sha1";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || null;
  
  if (!authHeader || !authHeader.startsWith('Basic ') || authHeader.split(' ').length !== 2) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [userEmail, userPwd] = credentials.split(':');

  const user = await (await dbClient.usersCollection()).findOne({ email: userEmail });

  if (!user || user.password !== sha1(userPwd)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
};

const tokenMiddleware = async (req, res, next) => {
  const token = req.headers['x-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = await redisClient.get(`auth_${token}`);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await (await dbClient.usersCollection()).findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = user;
  next();
};

export {tokenMiddleware, authMiddleware};