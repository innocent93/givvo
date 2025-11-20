// @ts-nocheck
import Stripe from 'stripe';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || 'usd',
      description,
      metadata: {
        userId: req.user.id,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, amount, type } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Create transaction record
    const transaction = new Transaction({
      user: req.user.id,
      type,
      amount,
      status: 'completed',
      paymentIntentId,
      stripeChargeId: paymentIntent.charges.data[0]?.id,
    });

    await transaction.save();

    // Update user balance if deposit
    if (type === 'deposit') {
      const user = await User.findById(req.user.id);
      user.wallet = (user.wallet || 0) + amount;
      await user.save();

      await Notification.create({
        user: req.user.id,
        type: 'system',
        title: 'Deposit Successful',
        message: `$${amount} has been added to your wallet`,
      });
    }

    res.json({
      message: 'Payment confirmed',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initiateWithdrawal = async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.wallet || user.wallet < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const transaction = new Transaction({
      user: req.user.id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      bankAccountId,
    });

    await transaction.save();

    user.wallet -= amount;
    await user.save();

    await Notification.create({
      user: req.user.id,
      type: 'system',
      title: 'Withdrawal Initiated',
      message: `Withdrawal of $${amount} is being processed`,
    });

    res.json({
      message: 'Withdrawal initiated',
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      balance: user.wallet || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
