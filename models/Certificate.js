const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },
  certificateId: {
    type: String,
    unique: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Certificate", certificateSchema);