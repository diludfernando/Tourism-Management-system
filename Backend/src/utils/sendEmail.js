const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
      user: process.env.EMAIL_USER, // Your admin email
      pass: process.env.EMAIL_PASSWORD, // Your app password
    },
  });

  // Define email options
  const mailOptions = {
    from: `"Tourism Management System" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
