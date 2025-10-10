
//reel.controller.js
import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Reel } from "../models/reel.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import streamifier from "streamifier";


export const addNewReel = async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.files);

    const { caption } = req.body;
    const files = req.files; // tableau de fichiers
    const authorId = req.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Media required", success: false });
    }

    const uploadedMedia = [];

    for (const file of files) {
      let mediaUrl;
      let mediaType = file.mimetype.startsWith("video") ? "video" : "image";

      if (mediaType === "image") {
        // Optimisation image avec sharp
        const optimizedImageBuffer = await sharp(file.buffer)
          .resize({ width: 800, height: 800, fit: "inside" })
          .toFormat("jpeg", { quality: 80 })
          .toBuffer();

        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString("base64")}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri, {
          folder: "reels",
          resource_type: "image"
        });
        mediaUrl = cloudResponse.secure_url;

      } else {
        // Upload vidéo
        mediaUrl = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "reels", resource_type: "video", format: "mp4" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      }

      uploadedMedia.push({ url: mediaUrl, type: mediaType });
    }

    // Créer le reel
    const reel = await Reel.create({
      caption,
      media: uploadedMedia,  // tableau [{ url, type }]
      author: authorId
    });

    // Ajouter le reel à l'utilisateur
    const user = await User.findById(authorId);
    if (user) {
      user.reels.push(reel._id);
      await user.save();
    }

    await reel.populate({ path: "author", select: "-password" });

    return res.status(201).json({
      message: "New reel added",
      reel,
      success: true
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};



export const getAllReel = async (req, res) => {
  try {
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: 'username profilePicture' })
      .populate({
        path: 'comments',
        sort: { createdAt: -1 },
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      });

    // on renvoie la structure avec media[]
    const formattedReels = reels.map(reel => ({
      _id: reel._id,
      caption: reel.caption,
      media: reel.media, // tableau [{ url, type }]
      author: reel.author,
      likes: reel.likes,
      comments: reel.comments,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt
    }));

    return res.status(200).json({
      reels: formattedReels,
      success: true
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};





export const getUserReel = async (req, res) => {
  try {
    const authorId = req.id;
    const reels = await Reel.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: 'username profilePicture' })
      .populate({
        path: 'comments',
        sort: { createdAt: -1 },
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      });

    const formattedReels = reels.map(reel => ({
      _id: reel._id,
      caption: reel.caption,
      media: reel.media, // tableau [{ url, type }]
      author: reel.author,
      likes: reel.likes,
      comments: reel.comments,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt
    }));

    return res.status(200).json({
      reels: formattedReels,
      success: true
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};




export const likeReel = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const reelId = req.params.id;
        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: 'Reel not found', success: false });

        // like logic started
        await reel.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
        await reel.save();

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');

        const reelOwnerId = reel.author.toString();
        if (reelOwnerId !== likeKrneWalaUserKiId) {
            // emit a notification event
            const notification = {
                type: 'like',
                userId: likeKrneWalaUserKiId,
                userDetails: user,
                reelId,
                message: 'Your reel was liked'
            }
            const reelOwnerSocketId = getReceiverSocketId(reelOwnerId);
            io.to(reelOwnerSocketId).emit('notification', notification);
        }

        return res.status(200).json({ message: 'Reel liked', success: true });
    } catch (error) {

    }
}
export const dislikeReel = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const reelId = req.params.id;
        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: 'Reel not found', success: false });

        // like logic started
        await reel.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
        await reel.save();

        // implement socket io for real time notification
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        const reelOwnerId = reel.author.toString();
        if (reelOwnerId !== likeKrneWalaUserKiId) {
            // emit a notification event
            const notification = {
                type: 'dislike',
                userId: likeKrneWalaUserKiId,
                userDetails: user,
                reelId,
                message: 'Your reel was liked'
            }
            const reelOwnerSocketId = getReceiverSocketId(reelOwnerId);
            io.to(reelOwnerSocketId).emit('notification', notification);
        }



        return res.status(200).json({ message: 'Reel disliked', success: true });
    } catch (error) {

    }
}
export const addComment = async (req, res) => {
    try {
        const reelId = req.params.id;
        const commentKrneWalaUserKiId = req.id;

        const { text } = req.body;

        const reel = await Reel.findById(reelId);

        if (!text) return res.status(400).json({ message: 'text is required', success: false });

        const comment = await Comment.create({
            text,
            author: commentKrneWalaUserKiId,
            reel: reelId
        })

        await comment.populate({
            path: 'author',
            select: "username profilePicture"
        });

        reel.comments.push(comment._id);
        await reel.save();

        return res.status(201).json({
            message: 'Comment Added',
            comment,
            success: true
        })

    } catch (error) {
        console.log(error);
    }
};
export const getCommentsOfReel = async (req, res) => {
    try {
        const reelId = req.params.id;

        const comments = await Comment.find({ reel: reelId }).populate('author', 'username profilePicture');

        if (!comments) return res.status(404).json({ message: 'No comments found for this reel', success: false });

        return res.status(200).json({ success: true, comments });

    } catch (error) {
        console.log(error);
    }
}
export const deleteReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const authorId = req.id;

        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: 'Reel not found', success: false });

        // check if the logged-in user is the owner of the reel
        if (reel.author.toString() !== authorId) return res.status(403).json({ message: 'Unauthorized' });

        // delete reel
        await Reel.findByIdAndDelete(reelId);

        // remove the reel id from the user's reel
        let user = await User.findById(authorId);
        user.reels = user.reels.filter(id => id.toString() !== reelId);
        await user.save();

        // delete associated comments
        await Comment.deleteMany({ reel: reelId });

        return res.status(200).json({
            success: true,
            message: 'Reel deleted'
        })

    } catch (error) {
        console.log(error);
    }
}
export const bookmarkReel = async (req, res) => {
    try {
        const reelId = req.params.id;
        const authorId = req.id;
        const reel = await Reel.findById(reelId);
        if (!reel) return res.status(404).json({ message: 'Reel not found', success: false });

        const user = await User.findById(authorId);
        if (user.bookmarks.includes(reel._id)) {
            // already bookmarked -> remove from the bookmark
            await user.updateOne({ $pull: { bookmarks: reel._id } });
            await user.save();
            return res.status(200).json({ type: 'unsaved', message: 'Reel removed from bookmark', success: true });

        } else {
            // bookmark krna pdega
            await user.updateOne({ $addToSet: { bookmarks: reel._id } });
            await user.save();
            return res.status(200).json({ type: 'saved', message: 'Reel bookmarked', success: true });
        }

    } catch (error) {
        console.log(error);
    }
}