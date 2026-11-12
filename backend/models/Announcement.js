
const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.date || value >= this.date;
        },
        message: "Expiry date must be on or after the publish date",
      },
    },
    status: {
      type: String,
      enum: ["Published", "Draft", "Expired"],
      default: "Published",
    },
    targetRole: {
      type: String,
      enum: ["All", "Student", "Faculty"],
      default: "All",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
