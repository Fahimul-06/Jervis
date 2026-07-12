import mongoose from 'mongoose';

const modelCache = new Map();

export async function connectDatabase(uri) {
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri);
  return mongoose.connection;
}

export function getCollectionModel(collectionName) {
  if (!/^[a-zA-Z0-9_]+$/.test(collectionName)) {
    throw new Error('Invalid collection name');
  }
  if (modelCache.has(collectionName)) return modelCache.get(collectionName);

  const schema = new mongoose.Schema({}, {
    strict: false,
    collection: collectionName,
    versionKey: false,
    timestamps: false,
  });

  const model = mongoose.model(`Dynamic_${collectionName}`, schema);
  modelCache.set(collectionName, model);
  return model;
}

export function serializeDocument(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (plain._id) {
    plain.id = String(plain._id);
    delete plain._id;
  }
  return plain;
}
