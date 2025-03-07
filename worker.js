import Queue from 'bull/lib/queue';
import imgThumbnail from 'image-thumbnail';
import mongoDBCore from 'mongodb/lib/core';
import { writeFile } from 'fs';
import dbClient from './utils/db';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);
const fileQueue = new Queue('thumbnail generation');


const generateThumbnail = async (filePath, size) => {
  const buffer = await imgThumbnail(filePath, { width: size });
  console.log(`Generating file: ${filePath}, size: ${size}`);
  return writeFileAsync(`${filePath}_${size}`, buffer);
};

fileQueue.process(async (job, done) => {
  const fileId = job.data.fileId || null;
  const userId = job.data.userId || null;

  if (!fileId) {
    throw new Error("Missing fileId");
  }
  if (!userId) {
    throw new Error("Missing userId");
  }
  console.log("Processing", job.data.name || "");
  const file = await (
    await dbClient.filesCollection()
  ).findOne({
    _id: new mongoDBCore.BSON.ObjectId(fileId),
    userId: new mongoDBCore.BSON.ObjectId(userId),
  });
  if (!file) {
    throw new Error("File not found");
  }
  const sizes = [500, 250, 100];
  Promise.all(
    sizes.map((size) => generateThumbnail(file.localPath, size))
  ).then(() => {
    done();
  });
});
