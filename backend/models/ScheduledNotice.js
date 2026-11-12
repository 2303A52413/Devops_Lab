
const mongoose = require("mongoose");

const scheduledNoticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["All", "Student", "Faculty"],
      default: "All",
    },
    publishDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.publishDate || value >= this.publishDate;
        },
        message: "Expiry date must be on or after the publish date",
      },
    },
    status: {
      type: String,
      default: "Scheduled",
      enum: ["Scheduled", "Publishing", "Published", "Cancelled", "Expired"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ScheduledNotice",
  scheduledNoticeSchema
);
