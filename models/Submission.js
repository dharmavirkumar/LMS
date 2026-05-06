const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },

  // 🔥 FIXED FIELDS
  link: String,   // GitHub / Live project link
  file: String,   // Uploaded file (zip/pdf/image)

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", submissionSchema);