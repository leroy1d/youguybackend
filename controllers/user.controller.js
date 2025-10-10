import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(401).json({
                message: "Try different email",
                success: false,
            });
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword
        });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true,
        });
    } catch (error) {
        console.log(error);
    }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // populate each post if in the posts array
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }
        return res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
    }
};
export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({path:'posts', createdAt:-1}).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
    }
};
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
    }
};
export const followOrUnfollow = async (req, res) => {
    try {
        console.log(req.id, req.params.id);
        const followKrneWala = req.id; // patel
        const jiskoFollowKrunga = req.params.id; // shivani
        if (followKrneWala === jiskoFollowKrunga) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowKrunga);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        // mai check krunga ki follow krna hai ya unfollow
        const isFollowing = user.following.includes(jiskoFollowKrunga);
        if (isFollowing) {
            // unfollow logic ayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {
            // follow logic ayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'followed successfully', success: true });
        }
    } catch (error) {
        console.log(error);
    }
}

// Ajoutez cette fonction dans user.controller.js
export const getSuggestedProfiles = async (req, res) => {
    try {
        const currentUserId = req.id;
        
        // Récupérer l'utilisateur courant avec ses followers/following
        const currentUser = await User.findById(currentUserId)
            .populate('followers', 'username profilePicture')
            .populate('following', 'username profilePicture');
        
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // 1. Exclure l'utilisateur courant et ceux déjà suivis
        const excludedIds = [currentUserId, ...currentUser.following.map(u => u._id)];
        
        // 2. Trouver les utilisateurs ayant interagi avec les posts de l'utilisateur courant
        const userPosts = await Post.find({ author: currentUserId });
        const userPostIds = userPosts.map(post => post._id);
        
        // Utilisateurs ayant liké ou commenté les posts de l'utilisateur courant
        const interactingUsers = await User.aggregate([
            {
                $match: {
                    _id: { $nin: excludedIds }
                }
            },
            {
                $lookup: {
                    from: 'posts',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $in: ['$$userId', '$likes'] },
                                        { $in: ['$$userId', '$comments.user'] }
                                    ]
                                },
                                author: currentUserId
                            }
                        }
                    ],
                    as: 'interactedPosts'
                }
            },
            {
                $match: {
                    'interactedPosts.0': { $exists: true }
                }
            },
            { $limit: 5 }
        ]);

        // 3. Trouver des utilisateurs avec des followers/following similaires
        const similarUsers = await User.aggregate([
            {
                $match: {
                    _id: { $nin: excludedIds }
                }
            },
            {
                $addFields: {
                    commonFollowers: {
                        $size: {
                            $setIntersection: [
                                '$followers', 
                                currentUser.followers.map(f => f._id)
                            ]
                        }
                    },
                    commonFollowing: {
                        $size: {
                            $setIntersection: [
                                '$following', 
                                currentUser.following.map(f => f._id)
                            ]
                        }
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { commonFollowers: { $gt: 0 } },
                        { commonFollowing: { $gt: 0 } }
                    ]
                }
            },
            { $sort: { commonFollowers: -1, commonFollowing: -1 } },
            { $limit: 5 }
        ]);

        // 4. Trouver des utilisateurs récents (pas encore suivis)
        const recentUsers = await User.find({
            _id: { $nin: excludedIds }
        })
        .sort({ createdAt: -1 })
        .limit(5);

        // Combiner et dédupliquer les résultats
        const allSuggestions = [...interactingUsers, ...similarUsers, ...recentUsers];
        const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
            index === self.findIndex(s => s._id.toString() === suggestion._id.toString())
        );

        // Limiter à 10 suggestions maximum
        const finalSuggestions = uniqueSuggestions.slice(0, 10);

        // Populer les informations nécessaires
        const populatedSuggestions = await User.populate(finalSuggestions, [
            { path: 'followers', select: 'username profilePicture' },
            { path: 'following', select: 'username profilePicture' }
        ]);

        res.status(200).json({
            success: true,
            suggestedUsers: populatedSuggestions
        });

    } catch (error) {
        console.error('Error fetching suggested profiles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching suggested profiles'
        });
    }
};