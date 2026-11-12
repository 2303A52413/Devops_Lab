const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    university: {
      type: String,
      default: "SR University",
      trim: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    expiryDays: {
      type: String,
      default: "7",
    },
    autoExpire: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
