// models/Blog.js
const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  summary: {
    type: String,
    required: true,
    maxlength: 500
  },

  thumbnail: {
    type: String,
    required: true
  },

  githubUrl: {
    type: String,
    required: true
  },

  liveUrl: {
    type: String,
    default: ""
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Blog", blogSchema);