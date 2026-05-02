const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const phoneRegex = /^\+?\d{10,15}$/;

const normalizeName = (name) => (typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '');
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const normalizePhoneNumber = (phoneNumber) => {
  if (typeof phoneNumber !== 'string') return '';
  const trimmed = phoneNumber.trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const normalizedName = normalizeName(name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    if (!normalizedName || !normalizedEmail || !password || !normalizedPhoneNumber) {
      return res.status(400).json({ message: 'Name, phone number, email and password are required' });
    }

    if (normalizedName.length < 2 || normalizedName.length > 60) {
      return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!phoneRegex.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Please enter a valid phone number' });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const phoneExists = await User.findOne({ phoneNumber: normalizedPhoneNumber });

    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number is already in use' });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      password,
      role: 'user', // Default role
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);

    // Duplicate key error (MongoDB code 11000)
    if (error && error.code === 11000) {
      if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      if (error.keyPattern && error.keyPattern.phoneNumber) {
        return res.status(400).json({ message: 'Phone number is already in use' });
      }
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} is already in use` });
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error while loading users' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user && req.user._id && String(req.user._id) === String(user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    console.log('=== UPDATE PROFILE REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('Request body:', { name, phoneNumber });
    console.log('File received:', req.file ? `${req.file.filename}` : 'No file');

    const user = await User.findById(req.user._id);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Current user before update:', { name: user.name, phoneNumber: user.phoneNumber });

    const updateData = {};

    // Validate and prepare name update
    if (name !== undefined && name !== null) {
      const normalizedName = normalizeName(name);
      console.log('Processing name:', { original: name, normalized: normalizedName });

      if (!normalizedName) {
        console.log('Name is empty after normalization');
        return res.status(400).json({ message: 'Name is required' });
      }

      if (normalizedName.length < 2 || normalizedName.length > 60) {
        console.log('Name length validation failed');
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
      }

      if (normalizedName !== user.name) {
        updateData.name = normalizedName;
        console.log('Name will be updated to:', normalizedName);
      } else {
        console.log('Name unchanged');
      }
    }

    // Validate and prepare phone update
    if (phoneNumber !== undefined && phoneNumber !== null) {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      console.log('Processing phone:', { original: phoneNumber, normalized: normalizedPhoneNumber });

      if (!normalizedPhoneNumber) {
        console.log('Phone is empty after normalization');
        return res.status(400).json({ message: 'Phone number is required' });
      }

      if (!phoneRegex.test(normalizedPhoneNumber)) {
        console.log('Phone regex validation failed');
        return res.status(400).json({ message: 'Please enter a valid phone number' });
      }

      if (normalizedPhoneNumber !== user.phoneNumber) {
        // Only check for duplicates if phone is actually changing
        const existingPhone = await User.findOne({ phoneNumber: normalizedPhoneNumber });
        console.log('Existing phone check:', { found: !!existingPhone, existingId: existingPhone?._id, currentId: user._id });

        if (existingPhone && String(existingPhone._id) !== String(user._id)) {
          console.log('Phone already in use by another user');
          return res.status(400).json({ message: 'Phone number is already in use' });
        }

        updateData.phoneNumber = normalizedPhoneNumber;
        console.log('Phone will be updated to:', normalizedPhoneNumber);
      } else {
        console.log('Phone unchanged');
      }
    }

    // Handle profile photo upload
    if (req.file) {
      const photoPath = `/uploads/${req.file.filename}`;
      updateData.profilePhoto = photoPath;
      console.log('Profile photo will be updated to:', photoPath);
    }

    // If no changes, return current data
    if (Object.keys(updateData).length === 0) {
      console.log('No changes detected, returning current user data');
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    console.log('Attempting to update user with:', updateData);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).select('-password');

    console.log('User updated successfully');
    console.log('Updated user:', { name: updatedUser.name, phoneNumber: updatedUser.phoneNumber, profilePhoto: updatedUser.profilePhoto, updatedAt: updatedUser.updatedAt });

    res.json(updatedUser);
  } catch (error) {
    console.error('=== UPDATE PROFILE ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);

    if (error.code === 11000) {
      console.error('Duplicate key error on fields:', Object.keys(error.keyPattern));
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} is already in use` });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

// @desc    Get a specific user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// @desc    Update a specific user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, phoneNumber, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};

    // Validate and prepare name update
    if (name !== undefined && name !== null) {
      const normalizedName = normalizeName(name);

      if (!normalizedName) {
        return res.status(400).json({ message: 'Name is required' });
      }

      if (normalizedName.length < 2 || normalizedName.length > 60) {
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
      }

      if (normalizedName !== user.name) {
        updateData.name = normalizedName;
      }
    }

    // Validate and prepare phone update
    if (phoneNumber !== undefined && phoneNumber !== null) {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

      if (!normalizedPhoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      if (!phoneRegex.test(normalizedPhoneNumber)) {
        return res.status(400).json({ message: 'Please enter a valid phone number' });
      }

      if (normalizedPhoneNumber !== user.phoneNumber) {
        const existingPhone = await User.findOne({ phoneNumber: normalizedPhoneNumber });

        if (existingPhone && String(existingPhone._id) !== String(user._id)) {
          return res.status(400).json({ message: 'Phone number is already in use' });
        }

        updateData.phoneNumber = normalizedPhoneNumber;
      }
    }

    // Handle role update (admin only can change roles)
    if (role !== undefined && role !== null) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      if (role !== user.role) {
        updateData.role = role;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
};

// @desc    Forgot password - Request OTP
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // For security, don't reveal if user exists. Just say "If an account exists..."
      // But for this app, we'll be direct to help the user.
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expires;
    await user.save();

    // Send the actual email
    const message = `Your password reset verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #003580;">Password Reset Verification</h2>
        <p>Hello,</p>
        <p>You requested a password reset. Please use the following 6-digit verification code to proceed:</p>
        <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #003580; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code is valid for <strong>10 minutes</strong>. If you did not request this reset, please ignore this email.</p>
        <br/>
        <p>Best regards,<br/>Tourism Management Team</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Verification Code',
        message,
        html,
      });

      res.json({ message: 'Verification code sent to your email' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Fallback: Still log it to console so it's not broken during dev
      console.log('--- FALLBACK OTP (Email Failed) ---');
      console.log(`OTP for ${user.email}: ${otp}`);
      console.log('-----------------------------------');
      
      res.json({ 
        message: 'OTP generated but email failed to send. Check backend console for the code during development.',
        devCode: otp // You might want to remove this in production
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during forgot password' });
  }
};

// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    console.log('=== VERIFY OTP REQUEST ===');
    console.log('Email:', normalizedEmail);
    console.log('OTP:', otp);

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      console.log('OTP Verification Failed: User not found or OTP expired/invalid');
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    console.log('OTP Verified Successfully for:', normalizedEmail);
    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/users/reset-password
// @access  Public
const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }

    console.log('=== RESET PASSWORD REQUEST ===');
    console.log('Email:', normalizedEmail);
    console.log('OTP:', otp);

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordOTP: otp
    });

    if (!user) {
      console.log('Reset Failed: User with this email and OTP not found in DB');
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const now = new Date();
    console.log('Current Time:', now.toISOString());
    console.log('OTP Expiry:', user.resetPasswordExpires ? user.resetPasswordExpires.toISOString() : 'MISSING');

    if (!user.resetPasswordExpires || user.resetPasswordExpires < now) {
      console.log('Reset Failed: OTP has expired');
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    console.log('Reset Verification Successful for:', normalizedEmail);

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be 8+ chars with uppercase, lowercase, number, and special character',
      });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

module.exports = {
  authUser,
  registerUser,
  getUsers,
  deleteUser,
  getCurrentUser,
  updateProfile,
  getUserById,
  updateUser,
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPasswordWithOTP,
};
