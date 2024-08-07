import dbClient from "../utils/db.js";
import mongoDBCore from 'mongodb/lib/core/index.js';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { tmpdir } from 'os';
import { promisify } from "util";
import { v4 as uuidv4 } from 'uuid';
import { contentType } from "mime-types";


const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);

const VALID_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};
const isValidId = (id) => {
  const size = 24;
  let i = 0;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  while (i < size) {
    const c = id[i];
    const code = c.charCodeAt(0);

    if (!charRanges.some((range) => code >= range[0] && code <= range[1])) {
      return false;
    }
    i += 1;
  }
  return true;
};
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');
const DEFAULT_ROOT_FOLDER = 'files_manager';
const ROOT_ID = 0;
const MAX_FILE_PER_PAGE = 20

const getUserFromXToken = async (req) => {
  const token = req.headers['x-token'];

  if (!token) {
    return null;
  }
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return null;
  }
  const user = await (await dbClient.usersCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
  return user || null;
};


export default class FilesController {
  static async postUpload (req, res) {
    const fileName = req.body ? req.body.name : null;
    const fileType = req.body ? req.body.type : null;
    const fileParentId = req.body && req.body.parentId ? req.body.parentId : ROOT_ID;
    const fileIsPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const folderData = req.body && (req.body.type === "file" || req.body.type === "image") ? req.body.data : '';

    if (!fileName) {
      res.status(400).json({ error: "Missing name" });
      return;
    }

    if (!fileType && !Object.values(VALID_TYPES).includ(fileType)) {
      res.status(400).json({ error: "Missing type" });
      return;
    }

    if (!req.body.data && fileType !== VALID_TYPES.folder) {
      res.status(400).json({ error: "Missing data" });
      return;
    }

    if (fileParentId !== ROOT_ID && fileParentId !== ROOT_ID.toString()) {
      const file = await (await dbClient.filesCollection()).findOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileParentId) ? fileParentId : NULL_ID), });

      if (!file) {
        res.status(400).json({ error: "Parent not found" });
        return;
      }
      else if (file.type !== VALID_TYPES.folder) {
        res.status(400).json({ error: "Parent is not a folder" });
        return;
      }
    }

    const { user } = req;
    const fileOwnerId = user._id.toString();

    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0  ? process.env.FOLDER_PATH.trim() : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(fileOwnerId),
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: (fileParentId === ROOT_ID) || (fileParentId === ROOT_ID.toString()) ? '0' : new mongoDBCore.BSON.ObjectId(fileParentId),
    };

    await mkDirAsync(baseDir, { recursive: true });

    if (fileType !== VALID_TYPES.folder) {
      const fileLocalPath = joinPath(baseDir, uuidv4());
      await writeFileAsync(fileLocalPath, Buffer.from(folderData, 'base64'));
      newFile.localPath = fileLocalPath;
    }

    const fileInsert = await (await dbClient.filesCollection()).insertOne(newFile);
    const fileId = fileInsert.insertedId.toString();

    res.status(201).json({
      id: fileId,
      userId: fileOwnerId,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: (fileParentId === ROOT_ID) || (fileParentId === ROOT_ID.toString())
        ? 0
        : fileParentId,
    });
  }

  static async getShow(req, res) {
    const { user } = getUserFromXToken(req);
    const userId = user._id.toString();
  
    const fileId= req.params ? req.params.id : NULL_ID

    const file = await (await dbClient.filesCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) });


    if (!file) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({ 
      id: fileId,
      userId: userId,
      name: file.name,
      type: file.type,
      parentId: file.parentId === ROOT_ID.toString() ? 0 : file.parentId.toString(),
     });
  }

  static async getIndex(req, res) {
    const { user } = req;
    const userId = user._id;
    const filesParentId = req.query.parentId || ROOT_ID.toString();
    const page = /\d+/.test((req.query.page || '').toString())
      ? Number.parseInt(req.query.page, 10)
      : 0;
  
    const filesFilter = {
      userId: userId,
      parentId: filesParentId === ROOT_ID.toString() ? filesParentId: new mongoDBCore.BSON.ObjectId(isValidId(filesParentId) ? filesParentId : NULL_ID),
    }

    const files = await (await (await dbClient.filesCollection())
    .aggregate([
      { $match: filesFilter },
      { $sort: { _id: -1 } },
      { $skip: page * MAX_FILE_PER_PAGE },
      { $limit: MAX_FILE_PER_PAGE },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: {
            $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
          },
        },
      },
    ])).toArray();

    res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const { user } = req;
    const userId = user._id.toString();
    const fileId = req.params.id;

    const file = await (await dbClient.filesCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) });

    if (!file) {
      res.status(401).json({ error: "Not found" });
      return;
    }

    await (await dbClient.filesCollection())
    .updateOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) }, { $set: { isPublic: true } });

    res.status(200).json({ 
      id: fileId,
      userId: userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_ID.toString() ? 0 : file.parentId.toString(),
     });
  }

  static async putUnpublish(req, res) {
    const { user } = req;
    const userId = user._id.toString();
    const fileId = req.params.id;

    const file = await (await dbClient.filesCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) });

    if (!file) {
      res.status(401).json({ error: "Not found" });
      return;
    }

    await (await dbClient.filesCollection())
    .updateOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) }, { $set: { isPublic: false } });

    res.status(200).json({ 
      id: fileId,
      userId: userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === ROOT_ID.toString() ? 0 : file.parentId.toString(),
     });
  }

  static async getFile(req, res) {
    const { user } = req;
    const userId = user ? user._id.toString() : '';
    const fileId = req.params.id;
    const size = req.query.size || null;
    const file = await (await dbClient.filesCollection())
    .findOne({ _id: new mongoDBCore.BSON.ObjectId(isValidId(fileId) ? fileId : NULL_ID), userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID) });

    if (!file) {
      res.status(401).json({ error: "Not found" });
      return;
    }

    if (!file.isPublic && (userId !== file.userId.toString())) {
      res.status(401).json({ error: "Not found" });
      return;
    }

    if (file.type === VALID_TYPES.folder) {
      res.status(401).json({ error: "A folder doesn't have content" });
      return;
    }

    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }
    if (existsSync(filePath)) {
      const fileInfo = await statAsync(filePath);
      if (!fileInfo.isFile()) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
    } else {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const absoluteFilePath = await realpathAsync(filePath);
    res.setHeader('Content-Type', contentType(file.name) || 'text/plain; charset=utf-8');
    res.status(200).sendFile(absoluteFilePath);
  }
}
