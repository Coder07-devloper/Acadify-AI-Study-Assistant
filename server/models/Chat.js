const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    // For assistant messages we can optionally store rich data
    roadmap: {
      type: Schema.Types.Mixed,
    },
    recommendedVideos: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // New conversation-style storage
    messages: {
      type: [messageSchema],
      default: [],
    },

    // Legacy fields kept for backward compatibility with existing data
    message: {
      type: String,
      trim: true,
    },
    response: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;

