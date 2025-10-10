// API route pour les profils suggérés
router.get('/suggested-profiles', authenticate, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // 1. Utilisateurs ayant interagi avec l'utilisateur courant
        const interactedUsers = await User.aggregate([
            {
                $match: {
                    $or: [
                        { _id: { $in: currentUser.following } },
                        { followers: currentUser._id }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'posts',
                    localField: '_id',
                    foreignField: 'author',
                    as: 'posts'
                }
            },
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'comments'
                }
            },
            {
                $addFields: {
                    interactionScore: {
                        $add: [
                            { $size: { $setIntersection: ['$followers', currentUser.following] } },
                            { $size: { $setIntersection: ['$following', currentUser.followers] } },
                            { $size: { $ifNull: ['$posts', []] } },
                            { $size: { $ifNull: ['$comments', []] } }
                        ]
                    }
                }
            },
            { $sort: { interactionScore: -1 } },
            { $limit: 10 }
        ]);

        // 2. Utilisateurs avec des centres d'intérêt similaires (basés sur les posts likés)
        const userLikedPosts = await Post.find({ likes: currentUser._id });
        const similarInterestUsers = await User.aggregate([
            {
                $match: {
                    _id: { $ne: currentUser._id },
                    'likedPosts': { $in: userLikedPosts.map(p => p._id) }
                }
            },
            { $sample: { size: 5 } }
        ]);

        // 3. Utilisateurs avec des amis en commun
        const commonFriendsUsers = await User.aggregate([
            {
                $match: {
                    _id: { $ne: currentUser._id },
                    $or: [
                        { followers: { $in: currentUser.following } },
                        { following: { $in: currentUser.followers } }
                    ]
                }
            },
            {
                $addFields: {
                    commonFriendsCount: {
                        $size: {
                            $setIntersection: [
                                { $concatArrays: ['$followers', '$following'] },
                                { $concatArrays: [currentUser.followers, currentUser.following] }
                            ]
                        }
                    }
                }
            },
            { $sort: { commonFriendsCount: -1 } },
            { $limit: 5 }
        ]);

        // 4. Utilisateurs ayant récemment publié un reel
        const recentReelUsers = await User.aggregate([
            {
                $lookup: {
                    from: 'reels',
                    localField: '_id',
                    foreignField: 'author',
                    as: 'reels'
                }
            },
            {
                $match: {
                    'reels.createdAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Derniers 7 jours
                }
            },
            { $sample: { size: 5 } }
        ]);

        // Fusionner tous les résultats et éliminer les doublons
        const allSuggestions = [
            ...interactedUsers,
            ...similarInterestUsers,
            ...commonFriendsUsers,
            ...recentReelUsers
        ];

        const uniqueSuggestions = allSuggestions.filter((user, index, self) =>
            index === self.findIndex(u => u._id.toString() === user._id.toString())
        );

        // Exclure l'utilisateur courant et ceux déjà suivis
        const filteredSuggestions = uniqueSuggestions.filter(suggestion =>
            suggestion._id.toString() !== currentUser._id.toString() &&
            !currentUser.following.includes(suggestion._id)
        );

        res.status(200).json({
            success: true,
            suggestedUsers: filteredSuggestions.slice(0, 15) // Limiter à 15 suggestions
        });
    } catch (error) {
        console.error('Error fetching suggested profiles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching suggested profiles'
        });
    }
});