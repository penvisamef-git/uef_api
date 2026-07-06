const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true },
    organization: { type: String, required: true },
    job_title: { type: String, required: false },
    password: { type: String, required: true },
    group_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserGroupPermission",
      required: true,
    },

    is_first_login: {
      type: Boolean,
      default: true,
    },

    is_super_admin_and_developer: {
      type: Boolean,
      default: false,
    },

    is_super_admin: {
      type: Boolean,
      default: false,
    },

    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
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
module.exports = mongoose.model("User", userSchema);
