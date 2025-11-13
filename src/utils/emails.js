// import dotenv from "dotenv";
// import nodemailer from "nodemailer";
// import postmarkTransport from "nodemailer-postmark-transport";

// dotenv.config();

// // ✅ Use Postmark instead of Gmail
// const transporter = nodemailer.createTransport(
//   postmarkTransport({
//     auth: {
//       apiKey: process.env.POSTMARK_API_KEY, // Your Postmark Server API Token
//     },
//   })
// );

// // ✅ Verify transporter on startup
// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Postmark transporter error:", error);
//   } else {
//     console.log("✅ Postmark server is ready to send messages");
//   }
// });

// // ✅ Master email template wrapper (uniform branding)
// const buildEmailTemplate = (title, message, code = null, buttonText = null, buttonLink = null) => {
//   return `
//   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
//               border: 1px solid #eee; padding: 20px; border-radius: 10px; background: #fafafa;">
//     <h2 style="color: #2c3e50; text-align: center;">🚗 Auction System</h2>
//     <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

//     <h3 style="color: #27ae60;">${title}</h3>
//     <p style="font-size: 15px; color: #333;">${message}</p>

//     ${
//       code
//         ? `<div style="background:#f4f4f4;padding:12px 20px;border-radius:8px;
//                      font-size:20px;font-weight:bold;width:max-content;margin:20px auto;text-align:center;">
//             ${code}
//           </div>`
//         : ""
//     }

//     ${
//       buttonText && buttonLink
//         ? `<div style="text-align: center; margin-top: 25px;">
//             <a href="${buttonLink}" style="background: #27ae60; color: white;
//                padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
//               ${buttonText}
//             </a>
//           </div>`
//         : ""
//     }

//     <p style="font-size: 13px; color: #777; margin-top: 40px; text-align:center;">
//       If you have any questions, please contact our support team.<br>
//       © ${new Date().getFullYear()} Auction System. All rights reserved.
//     </p>
//   </div>`;
// };

// // ✅ Send email function
// const sendEmail = async (to, subject, html) => {
//   try {
//     await transporter.sendMail({
//      from: "testing@postmarkapp.com",
//     to: "oghaleinnocent93+3@gmail.com",

//       subject,
//       html,
//     });
//     console.log(`📩 Email sent to ${to}`);
//   } catch (err) {
//     console.error("❌ Error sending email:", err);
//   }
// };

// // ✅ Quick helpers for common use cases
// const sendVerificationEmail = async (to, code) => {
//   return sendEmail(
//     to,
//     "Verify Your Auction System Email",
//     buildEmailTemplate("Verify Your Email", "Please use the code below to verify your email. It expires in 10 minutes.", code)
//   );
// };

// const sendPasswordResetEmail = async (to, code) => {
//   return sendEmail(
//     to,
//     "Password Reset Code",
//     buildEmailTemplate("Password Reset Request", "Use the code below to reset your password. It expires in 10 minutes.", code)
//   );
// };

// const sendApprovalEmail = async (to) => {
//   return sendEmail(
//     to,
//     "Account Approved 🎉",
//     buildEmailTemplate(
//       "Your Account is Approved",
//       "Congratulations! Your documents have been approved. You can now log in and start using Auction System.",
//       null,
//       "Go to Dashboard",
//       process.env.CLIENT_URL || "http://localhost:3000"
//     )
//   );
// };

// const sendRejectionEmail = async (to, reason) => {
//   return sendEmail(
//     to,
//     "Document Rejected ❌",
//     buildEmailTemplate(
//       "Your Document Was Rejected",
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
// };

// @ts-nocheck
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Configure OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // redirect URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ✅ Create transporter with OAuth2
const createTransporter = async () => {
  const accessTokenObj = await oAuth2Client.getAccessToken();
  const accessToken = accessTokenObj.token;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });
};

// ✅ Master email template wrapper (uniform branding)
const buildEmailTemplate = (
  title,
  message,
  code = null,
  buttonText = null,
  buttonLink = null
) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
              border: 1px solid #eee; padding: 20px; border-radius: 10px; background: #fafafa;">
    <h2 style="color: #2c3e50; text-align: center;">🚗 Auction System</h2>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    
    <h3 style="color: #27ae60;">${title}</h3>
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
  </div>
`;

// ✅ Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: `"Auction System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Error sending email:', err);
  }
};

// ✅ Quick helpers for common use cases
const sendVerificationEmail = async (to, code) =>
  sendEmail(
    to,
    'Verify Your Auction System Email',
    buildEmailTemplate(
      'Verify Your Email',
      'Please use the code below to verify your email. It expires in 10 minutes.',
      code
    )
  );

const sendPasswordResetEmail = async (to, code) =>
  sendEmail(
    to,
    'Password Reset Code',
    buildEmailTemplate(
      'Password Reset Request',
      'Use the code below to reset your password. It expires in 10 minutes.',
      code
    )
  );

const sendApprovalEmail = async to =>
  sendEmail(
    to,
    'Account Approved 🎉',
    buildEmailTemplate(
      'Your Account is Approved',
      'Congratulations! Your documents have been approved. You can now log in and start using Auction System.',
      null,
      'Go to Dashboard',
      process.env.CLIENT_URL || 'http://localhost:3000'
    )
  );

const sendRejectionEmail = async (to, reason) =>
  sendEmail(
    to,
    'Document Rejected ❌',
    buildEmailTemplate(
      'Your Document Was Rejected',
      `Unfortunately, your submitted document was rejected. Reason: <b>${reason}</b>. Please upload a valid document and try again.`
    )
  );

export {
  sendEmail,
  buildEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};

// // @ts-nocheck
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Create transporter once
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // debug: true
});

// ✅ Verify transporter on startup
transporter.verify(error => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// ✅ Master email template wrapper (uniform branding)
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
    <h2 style="color: #2c3e50; text-align: center;">🚗 Auction System</h2>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    
    <h3 style="color: #27ae60;">${title}</h3>
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

// ✅ Send email function
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Auction System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Error sending email:', err);
  }
};

// ✅ Quick helpers for common use cases
const sendVerificationEmail = async (to, code) => {
  return sendEmail(
    to,
    'Verify Your Auction System Email',
    buildEmailTemplate(
      'Verify Your Email',
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
      'Password Reset Request',
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
      'Congratulations! Your documents have been approved. You can now log in and start using Auction System.',
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
      'Your Document Was Rejected',
      `Unfortunately, your submitted document was rejected. Reason: <b>${reason}</b>. Please upload a valid document and try again.`
    )
  );
};

export {
  sendEmail,
  buildEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};

// sendEmails.js
//

// // @ts-nocheck
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Create transporter once
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  // port: 465,
  // secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false,
  },
  // debug: true
});

// ✅ Verify transporter on startup
transporter.verify(error => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// ✅ Master email template wrapper (uniform branding)
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
    <h2 style="color: #2c3e50; text-align: center;">🚗 Auction System</h2>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    
    <h3 style="color: #27ae60;">${title}</h3>
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

// ✅ Send email function
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Auction System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📩 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Error sending email:', err);
  }
};

// ✅ Quick helpers for common use cases
const sendVerificationEmail = async (to, code) => {
  return sendEmail(
    to,
    'Verify Your Auction System Email',
    buildEmailTemplate(
      'Verify Your Email',
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
      'Password Reset Request',
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
      'Congratulations! Your documents have been approved. You can now log in and start using Auction System.',
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
      'Your Document Was Rejected',
      `Unfortunately, your submitted document was rejected. Reason: <b>${reason}</b>. Please upload a valid document and try again.`
    )
  );
};

export {
  sendEmail,
  buildEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};
