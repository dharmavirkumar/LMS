// config/cloudinary.js

require("dotenv").config();

const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/* =========================================================
   CLOUDINARY CONFIG
========================================================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/* =========================================================
   SAFE FILE NAME GENERATOR
========================================================= */
const generatePublicId = (file) => {
  const fileName = file.originalname
    .split(".")[0]
    .normalize("NFD")                     // Remove Hindi/Unicode issues
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${Date.now()}-${fileName}`;
};

/* =========================================================
   IMAGE STORAGE
========================================================= */
const imageStorage = new CloudinaryStorage({
  cloudinary, // IMPORTANT
  params: async (req, file) => ({
    folder: "lms_thumbnails",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: generatePublicId(file)
  })
});

/* =========================================================
   VIDEO STORAGE
========================================================= */
const videoStorage = new CloudinaryStorage({
  cloudinary, // IMPORTANT
  params: async (req, file) => ({
    folder: "lms_videos",
    resource_type: "video",
    public_id: generatePublicId(file)
  })
});

const uploadImage = multer({
  storage: imageStorage
});

const uploadVideo = multer({
  storage: videoStorage
});

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo
};