//reel.model.js
import mongoose from "mongoose";

const reelSchema = new mongoose.Schema({
    caption: { type: String, default: '' },

    // tableau de médias (images ou vidéos)
    media: [
        {
            url: { type: String, required: true },
            type: { type: String, enum: ["image", "video"], required: true }
        }
    ],

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { timestamps: true });

export const Reel = mongoose.model('reel', reelSchema);