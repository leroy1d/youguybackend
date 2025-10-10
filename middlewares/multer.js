import multer from "multer";

// Stockage en mémoire
const storage = multer.memoryStorage();

// Autoriser images et vidéos uniquement
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers image et vidéo sont autorisés"), false);
  }
};

// Limiter la taille des fichiers (100 MB max par fichier)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

export default upload;
