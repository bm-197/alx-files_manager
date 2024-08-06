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

    const user = await (await dbClient.usersCollection()).findOne({email: userEmail});

    if (user) {
      res.status(400).json({error: "Already exist"});
      return;
    }

    const userInsert = await (await dbClient.usersCollection()).insertOne({email: userEmail, password: sha1(userPwd)});
    const userId = userInsert.insertedId.toString();

    const newUser = {id: userId, email: userEmail};

    res.status(201).json(newUser);
  }

  static async getMe(req, res) {
    const { user } = req;

    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
