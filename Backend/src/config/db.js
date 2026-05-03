const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`\x1b[36m%s\x1b[0m`, `------------------------------------------------`);
    console.log(`\x1b[32m%s\x1b[0m`, `✅ MongoDB Connected Successfully!`);
    console.log(`\x1b[33m%s\x1b[0m`, `Host: ${conn.connection.host}`);
    console.log(`\x1b[33m%s\x1b[0m`, `Database: ${conn.connection.name}`);
    console.log(`\x1b[36m%s\x1b[0m`, `------------------------------------------------`);
  } catch (error) {
    console.error(`\x1b[31m%s\x1b[0m`, `❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
