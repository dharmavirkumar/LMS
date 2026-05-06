const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const {
  cloudinary,
  uploadImage,
  uploadVideo
} = require("../config/cloudinary");
const Submission = require("../models/Submission");
const Task = require("../models/Task");

// ================= AUTH MIDDLEWARE =================
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
 return res.redirect("/auth/login");
  }
  next();
}

// ================= CLOUDINARY STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "gyansify/submissions",
    resource_type: "auto",
    allowed_formats: [
      "pdf",
      "doc",
      "docx",
      "zip",
      "rar",
      "jpg",
      "jpeg",
      "png"
    ]
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// ================= GET SUBMISSION PAGE =================
router.get("/submit-task/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid Task ID");
    }

    const task = await Task.findById(id).populate("course");

    if (!task) {
      return res.status(404).send("Task not found");
    }

    const existing = await Submission.findOne({
      user: req.session.user._id,
      task: task._id
    });

    res.render("submission", {
      task,
      alreadySubmitted: !!existing,
      submission: existing
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading submission page");
  }
});

// ================= SUBMIT TASK =================
router.post(
  "/submit-task",
  isLoggedIn,
  upload.single("file"),
  async (req, res) => {
    try {
      const { taskId, link } = req.body;
      const userId = req.session.user._id;

      if (!taskId) {
        return res.status(400).send("Task ID is required");
      }

      if (!link && !req.file) {
        return res.status(400).send(
          "Please provide either a project link or upload a file."
        );
      }

      const existing = await Submission.findOne({
        user: userId,
        task: taskId
      });

      if (existing) {
        return res.status(409).send(
          "You have already submitted this task."
        );
      }

      await Submission.create({
        user: userId,
        task: taskId,
        link: link || null,
        file: req.file ? req.file.path : null,      // Cloudinary URL
        publicId: req.file ? req.file.filename : null // Cloudinary Public ID
      });

      res.redirect("/internship");

    } catch (err) {
      console.error("Submission Error:", err);
      res.status(500).send("Failed to submit task");
    }
  }
);

module.exports = router;