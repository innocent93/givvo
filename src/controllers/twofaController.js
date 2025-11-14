// controllers/twofaController.js
import generateTokenAndSetCookie from '#src/utils/helpers/generateTokenAndSetCookie.js';
import { sendTwoFactorVerificationEmail } from '#src/utils/sendEmails.js';
import User from '../models/userModel.js';
import crypto from 'crypto';

export const enable2FARequest = async (req, res) => {
  const { userId } = req.body;

        try {
            const code = crypto.randomInt(1000, 9999).toString();
            const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            const user = await User.findByIdAndUpdate(
              userId,
              {
                'twoFA.emailCode': code,
                'twoFA.emailCodeExpires': expires,
              },
              { new: true }
            );

            await sendTwoFactorVerificationEmail(email, code);

            //   await sendEmail(
            //     user.email,
            //     'Your Naelix 2FA Verification Code',
            //     `Your verification code is ${code}. It will expire in 10 minutes.`
            //   );

            res.json({ message: '2FA code sent to email.' }); 
        } catch (error) {
      console.error('Error in Enabling 2fa :', error);
      res.status(500).json({ error: error.message });
        }
};


export const verify2FAEnable = async (req, res) => {
  const { userId, code } = req.body;
     
    try {
         const user = await User.findById(userId);

         if (!user || !user.twoFA.emailCode)
           return res.status(400).json({ error: 'No code found' });

         if (new Date() > user.twoFA.emailCodeExpires)
           return res.status(400).json({ error: 'Code expired' });

         if (user.twoFA.emailCode !== code)
           return res.status(400).json({ error: 'Invalid code' });

         user.twoFA.enabled = true;
         user.twoFA.emailCode = undefined;
         user.twoFA.emailCodeExpires = undefined;
         await user.save();

         res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error('Error in Verifying 2fa :', error);
        res.status(500).json({ error: error.message });
        
    }
};



