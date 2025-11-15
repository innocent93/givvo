// // sendEmails.js
// // @ts-nocheck
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// // ✅ MailerSend SMTP transporter (username + password)
// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587, // TLS (STARTTLS)
//   secure: false, // must be false for port 587
//   auth: {
//     user: process.env.SMTP_USER, // your Gmail SMTP username
//     pass: process.env.SMTP_PASS, // your Gmail SMTP password
//   },
// });

// // ✅ Verify transporter
// transporter.verify(error => {
//   if (error) {
//     console.error('❌ Gmail transporter error:', error);
//   } else {
//     console.log('✅ Gmail SMTP server is ready to send messages');
//   }
// });

// // ✅ Email template builder
// const buildEmailTemplate = (
//   title,
//   message,
//   code = null,
//   buttonText = null,
//   buttonLink = null
// ) => {
//   return `
//   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
//               border: 1px solid #eee; padding: 20px; border-radius: 10px; background: #fafafa;">
//     <h2 style="color: #2c3e50; text-align: center;"> Givvo</h2>
//     <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

//  Crpyto App    <p style="font-size: 15px; color: #333;">${message}</p>

//     ${
//       code
//         ? `<div style="background:#f4f4f4;padding:12px 20px;border-radius:8px;
//                      font-size:20px;font-weight:bold;width:max-content;margin:20px auto;text-align:center;">
//             ${code}
//           </div>`
//         : ''
//     }

//     ${
//       buttonText && buttonLink
//         ? `<div style="text-align: center; margin-top: 25px;">
//             <a href="${buttonLink}" style="background: #27ae60; color: white;
//                padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
//               ${buttonText}
//             </a>
//           </div>`
//         : ''
//     }

//     <p style="font-size: 13px; color: #777; margin-top: 40px; text-align:center;">
//       If you have any questions, please contact our support team.<br>
//       © ${new Date().getFullYear()} Auction System. All rights reserved.
//     </p>
//   </div>`;
// };

// // ✅ Send email
// const sendEmail = async (to, subject, html) => {
//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_FROM, // must be a verified sender in Gmail User
//       to,
//       subject,
//       html,
//     });
//     console.log(`📩 Email sent to ${to}`);
//   } catch (err) {
//     console.error('❌ Error sending email:', err.message || err);
//   }
// };

// // ✅ Quick helpers
// const sendVerificationEmail = async (to, code) => {
//   return sendEmail(
//     to,
//     'Verify Your Email',
//     buildEmailTemplate(
//       'Verify Your Email',
//       'Please use the code below to verify your email. It expires in 10 minutes.',
//       code
//     )
//   );
// };

// const sendTwoFactorVerificationEmail = async (to, code) => {
//   return sendEmail(
//     to,
//     'Verify Your Email',
//     buildEmailTemplate(
//       'Verify Your 2FA Email',
//       'Please use the code below to verify your email. It expires in 10 minutes.',
//       code
//     )
//   );
// };

// const sendPasswordResetEmail = async (to, code) => {
//   return sendEmail(
//     to,
//     'Password Reset Code',
//     buildEmailTemplate(
//       'Password Reset Request',
//       'Use the code below to reset your password. It expires in 10 minutes.',
//       code
//     )
//   );
// };

// const sendApprovalEmail = async to => {
//   return sendEmail(
//     to,
//     'Account Approved 🎉',
//     buildEmailTemplate(
//       'Your Account is Approved',
//       'Congratulations! Your documents have been approved. You can now log in and start using Auction System.',
//       null,
//       'Go to Dashboard',
//       process.env.CLIENT_URL || 'http://localhost:3000'
//     )
//   );
// };

// const sendRejectionEmail = async (to, reason) => {
//   return sendEmail(
//     to,
//     'Document Rejected ❌',
//     buildEmailTemplate(
//       'Your Document Was Rejected',
//       `Unfortunately, your submitted document was rejected. Reason: <b>${reason}</b>. Please upload a valid document and try again.`
//     )
//   );
// };

// export {
//   sendEmail,
//   buildEmailTemplate,
//   sendVerificationEmail,
//   sendPasswordResetEmail,
//   sendApprovalEmail,
//   sendRejectionEmail,
//   sendTwoFactorVerificationEmail
// };

// sendEmails.js
// @ts-nocheck
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// --------------------
// INITIALIZE RESEND
// --------------------
const resend = new Resend(process.env.RESEND_API_KEY);

// --------------------
// EMAIL TEMPLATE BUILDER
// --------------------
const buildEmailTemplate = (
  title,
  message,
  code = null,
  buttonText = null,
  buttonLink = null
) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
              border: 1px solid #eee; padding: 20px; border-radius: 10px; background: #fafafa;">

    <h2 style="color: #2c3e50; text-align: center;">Givvo</h2>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

    <p style="font-size: 15px; color: #333;">${message}</p>

    ${
      code
        ? `<div style="background:#f4f4f4;padding:12px 20px;border-radius:8px;
                     font-size:20px;font-weight:bold;width:max-content;margin:20px auto;text-align:center;">
            ${code}
          </div>`
        : ''
    }

    ${
      buttonText && buttonLink
        ? `<div style="text-align: center; margin-top: 25px;">
            <a href="${buttonLink}" style="background: #27ae60; color: white;
               padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
              ${buttonText}
            </a>
          </div>`
        : ''
    }

    <p style="font-size: 13px; color: #777; margin-top: 40px; text-align:center;">
      If you have any questions, please contact our support team.<br>
      © ${new Date().getFullYear()} Auction System. All rights reserved.
    </p>
  </div>`;
};

// --------------------
// GENERALLY SEND EMAIL
// --------------------
const sendEmail = async (to, subject, html) => {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`📩 Email sent to ${to}`, data);
  } catch (err) {
    console.error('❌ Error sending email via Resend:', err);
  }
};

// --------------------
// HELPER EMAIL TYPES
// --------------------
const sendVerificationEmail = async (to, code) => {
  return sendEmail(
    to,
    'Verify Your Email',
    buildEmailTemplate(
      'Verify Your Email',
      'Please use the code below to verify your email. It expires in 10 minutes.',
      code
    )
  );
};

const sendTwoFactorVerificationEmail = async (to, code) => {
  return sendEmail(
    to,
    '2FA Verification Code',
    buildEmailTemplate(
      'Verify Your 2FA Email',
      'Please use the code below to verify your email. It expires in 10 minutes.',
      code
    )
  );
};

const sendPasswordResetEmail = async (to, code) => {
  return sendEmail(
    to,
    'Password Reset Code',
    buildEmailTemplate(
      'Reset Password',
      'Use the code below to reset your password. It expires in 10 minutes.',
      code
    )
  );
};

const sendApprovalEmail = async to => {
  return sendEmail(
    to,
    'Account Approved 🎉',
    buildEmailTemplate(
      'Your Account is Approved',
      'Congratulations! Your documents have been approved. You can now log in and start using the Auction System.',
      null,
      'Go to Dashboard',
      process.env.CLIENT_URL || 'http://localhost:3000'
    )
  );
};

const sendRejectionEmail = async (to, reason) => {
  return sendEmail(
    to,
    'Document Rejected ❌',
    buildEmailTemplate(
      'Document Rejected',
      `Unfortunately, your submitted document was rejected. Reason: <b>${reason}</b>. Please upload a valid document and try again.`
    )
  );
};

// --------------------
export {
  sendEmail,
  buildEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendTwoFactorVerificationEmail,
};
