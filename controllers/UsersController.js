import dbClient from '../utils/db.js';
import sha1 from 'sha1';

export default class UsersController {
  static async postNew(req, res) {
    const userEmail = req.body ? req.body.email : null;
    const userPwd = req.body ? req.body.password: null;

    if (!userEmail) {
      res.status(400).json({error: "Missing Email"});
      return;
    }
 
    if (!userPwd) {
      res.status(400).json({error: "Missing Password"});
      return;
    }

    const user = await dbClient.collection('users').findOne({email: userEmail});

    if (user) {
      res.status(400).json({error: "Already exist"});
      return;
    }

    const userInsert = await dbClient.collection('users').insertOne({email: userEmail, password: sha1(userPwd)});
    const userId = userInsert.insertedId.toString();

    const newUser = {id: userId, email: userEmail};

    res.status(201).json(newUser);
  }
}

