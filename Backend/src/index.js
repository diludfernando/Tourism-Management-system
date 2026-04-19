const app = require('./app');
const connectDB = require('./config/db');

const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin'
      });
      console.log(`\x1b[32m%s\x1b[0m`, `✅ Default Admin account seeded successfully.`);
    } else {
      console.log(`\x1b[36m%s\x1b[0m`, `ℹ️ Admin account already exists. Skipping seed.`);
    }
  } catch (err) {
    console.error(`\x1b[31m%s\x1b[0m`, `❌ Failed to seed Admin account: ${err.message}`);
  }
};

// Connect to MongoDB and seed admin
connectDB().then(() => {
  seedAdmin();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
