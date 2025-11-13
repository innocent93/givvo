import mongoose from 'mongoose';
import config from './index.js';
mongoose.set('strictQuery', true);
export async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log('Mongo connected');
}
