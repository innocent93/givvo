// @ts-nocheck
// utils/connectDB.js
import mongoose from 'mongoose';

const connectDB = async () => {
  const dbUrl = process.env.MONGO_URI;

  const connectWithRetry = async () => {
    try {
      const conn = await mongoose.connect(dbUrl);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      console.log('⏳ Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // retry after 5s
    }
  };

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected.');
  });

  mongoose.connection.on('error', err => {
    console.error('❌ MongoDB error:', err.message);
  });

  connectWithRetry();
};

export default connectDB;

// // @ts-nocheck
// import mongoose from "mongoose";

// const connectDB = async () =>
// {

// 	try
// 	{
// 		 const dbUrl = process.env.MONGO_URI || 'mongodb+srv://pageinnovations_db_user:Yj8lP87WkrdhEPtt@carhub.aharkbc.mongodb.net/?retryWrites=true&w=majority&appName=Carhub'
// 		const conn = await mongoose.connect(dbUrl, {
// 			// To avoid warnings in the console
// 			useNewUrlParser: true,
// 			useUnifiedTopology: true,
// 		});

// 		console.log(`MongoDB Connected: ${conn.connection.host}`);
// 	} catch (error) {
// 		console.error(`Error: ${error.message}`);
// 		process.exit(1);
// 	}
// };

// export default connectDB;
