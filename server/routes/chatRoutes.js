const express = require("express");
const multer = require("multer");

const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  generateResponse,
  getChatHistory,
  getSingleChat,
  deleteChat,
} = require("../controllers/chatController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/generate", protect, upload.single("file"), generateResponse);
router.get("/history", protect, getChatHistory);
router.get("/:id", protect, getSingleChat);
router.delete("/:id", protect, deleteChat);

module.exports = router;