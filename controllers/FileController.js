import dbClient from "../utils/db.js";
import mongoDBCore from 'mongodb/lib/core/index.js';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { tmpdir } from 'os';
import { promisify } from "util";
import { v4 as uuidv4 } from 'uuid';


const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

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



export default class FileController {
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
}

