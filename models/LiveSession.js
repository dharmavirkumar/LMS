const mongoose = require("mongoose");

const liveSessionSchema = new mongoose.Schema({
  title: String,
  description: String,

  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },

  // ✅ Proper Date (important)
  date: {
    type: Date,
    required: true
  },

  duration: {
    type: Number,
    default: 60
  },

  // 🔴 Zoom Integration
  zoomLink: String,
  meetingId: String,

  // (optional fallback)
  manualLink: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("LiveSession", liveSessionSchema);