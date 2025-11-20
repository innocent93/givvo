import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    trade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        attachments: [String],
        type: {
          type: String,
          enum: ['text', 'system', 'image'],
          default: 'text',
        },
        createdAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Chat', chatSchema);
