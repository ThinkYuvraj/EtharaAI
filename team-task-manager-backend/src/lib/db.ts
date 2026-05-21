import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set (check .env)');
  }

  // If you use the placeholder password in .env, Atlas will return `bad auth`.


  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err);
    // Avoid crashing the whole server; allow APIs to fail with 503 if DB is down.
    throw err;
  }
}

