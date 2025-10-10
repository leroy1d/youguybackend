import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: {
        type: String,
        required: false // Rendre optionnel pour les médias
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'voice', 'sticker', 'like'],
        default: 'text'
    },
    mediaUrl: {
        type: String,
        required: false
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);