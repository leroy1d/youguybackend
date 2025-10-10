import {Conversation} from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import {Message} from "../models/message.model.js"
import cloudinary from "../utils/cloudinary.js";
import multer from "multer";

// Configuration de multer pour les fichiers temporaires
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// for chatting
export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const { textMessage: message, messageType = 'text' } = req.body;

        let conversation = await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });
        
        // establish the conversation if not started yet.
        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        
        let mediaUrl = null;
        
        // Gestion des fichiers multimédias
        if (req.file) {
            if (messageType === 'image' || messageType === 'sticker') {
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const cloudResponse = await cloudinary.uploader.upload(dataURI, {
                    resource_type: "auto",
                    folder: "chat_media"
                });
                mediaUrl = cloudResponse.secure_url;
            } else if (messageType === 'voice') {
                // Pour les fichiers audio, vous pourriez utiliser un service spécialisé
                // ou configurer Cloudinary pour supporter l'audio
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const cloudResponse = await cloudinary.uploader.upload(dataURI, {
                    resource_type: "video", // Cloudinary traite l'audio comme vidéo
                    folder: "chat_voice"
                });
                mediaUrl = cloudResponse.secure_url;
            }
        }
        
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: messageType === 'like' ? '❤️' : message,
            messageType,
            mediaUrl
        });
        
        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(), newMessage.save()])

        // implement socket io for real time data transfer
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        return res.status(201).json({
            success:true,
            newMessage
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, error: error.message});
    }
}

// Ajouter un like à un message
export const likeMessage = async (req, res) => {
    try {
        const userId = req.id;
        const { messageId } = req.params;
        
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ success: false, error: "Message not found" });
        }
        
        // Vérifier si l'utilisateur a déjà liké le message
        const hasLiked = message.likes.includes(userId);
        
        if (hasLiked) {
            // Retirer le like
            message.likes = message.likes.filter(id => id.toString() !== userId);
        } else {
            // Ajouter le like
            message.likes.push(userId);
        }
        
        await message.save();
        
        // Notifier les utilisateurs concernés via Socket.io
        const receiverSocketId = getReceiverSocketId(message.senderId.toString() === userId ? message.receiverId : message.senderId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageLiked', { messageId, likes: message.likes });
        }
        
        return res.status(200).json({
            success: true,
            likes: message.likes
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate('messages');
        if(!conversation) return res.status(200).json({success:true, messages:[]});

        return res.status(200).json({success:true, messages:conversation?.messages});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({success: false, error: error.message});
    }
}