const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },

  // 🎬 VIDEO PROGRESS
  completedLectures: [Number],

  // 📝 TASK PROGRESS
  completedTasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    }
  ],

  totalLectures: Number,
  totalTasks: Number,

  lecturePercentage: {
    type: Number,
    default: 0
  },

  taskPercentage: {
    type: Number,
    default: 0
  },

  overallPercentage: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Progress", progressSchema);