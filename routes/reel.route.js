//reel.route.js
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { addComment, addNewReel, bookmarkReel, deleteReel, dislikeReel, getAllReel, getCommentsOfReel, getUserReel, likeReel } from "../controllers/reel.controller.js";

const router = express.Router();

router.route("/addreel").post(
    isAuthenticated,
    upload.array('files', 10), // max 10 fichiers par Reel
    addNewReel
);

router.route("/all").get(isAuthenticated, getAllReel);
router.route("/userreel/all").get(isAuthenticated, getUserReel);
router.route("/:id/like").get(isAuthenticated, likeReel);
router.route("/:id/dislike").get(isAuthenticated, dislikeReel);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOfReel);
router.route("/delete/:id").delete(isAuthenticated, deleteReel);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkReel);

export default router;

// backend/routes/reel.route.js