const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }
});

module.exports = mongoose.model("Task", taskSchema);