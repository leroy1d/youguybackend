import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { getMessage, sendMessage, likeMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.route('/send/:id').post(isAuthenticated, upload.single('file'), sendMessage);
router.route('/all/:id').get(isAuthenticated, getMessage);
router.route('/like/:messageId').post(isAuthenticated, likeMessage);

export default router;