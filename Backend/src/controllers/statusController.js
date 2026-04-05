/**
 * @desc    Get server status
 * @route   GET /api/status
 * @access  Public
 */
const getStatus = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend is up and running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

module.exports = {
  getStatus,
};
