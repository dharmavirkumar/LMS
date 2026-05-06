// =============================
// CREATE NEW MODEL
// models/TaskAssignment.js
// =============================
const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  status: {
    type: String,
    default: "assigned"
  }
});

module.exports = mongoose.model(
  "TaskAssignment",
  taskAssignmentSchema
);