const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    version_number: {
      type: String,
      required: true,
    },

    version_build: {
      type: String,
      required: true,
    },

    // >>>>>> Defualt <<<<< //
    note: String,
    status: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_date", updatedAt: "updated_date" },
  },
);
module.exports = mongoose.model("VersionLog", userSchema);
