const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    // ==========================================
    // Personal Information
    // ==========================================
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },
    fullname_english: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    marital_status: {
      type: String,
      default: "single",
    },
    id_card_number: {
      type: String,
      trim: true,
      default: "",
    },
    passport_number: {
      type: String,
      trim: true,
      default: "",
    },
    present_address: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    personal_contact: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // Academic Background
    // ==========================================
    degree_level: {
      type: String,
      enum: ["certificate", "associate", "bachelor", "master", "phd"],
      required: true,
    },
    major: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // Work Experience
    // ==========================================
    working_position: {
      type: String,
      trim: true,
      default: "",
    },
    working_company: {
      type: String,
      trim: true,
      default: "",
    },
    working_place: {
      type: String,
      trim: true,
      default: "",
    },

    
    // ==========================================
    // password and user
         username: {
      type: String,
      trim: true,
      required: true,
    },
      password: {
      type: String,
      trim: true,
      required: true,
    },

    // ==========================================
    // Other
    // ==========================================
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // Default Fields
    // ==========================================
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
    deleted_at: {
      type: Date,
      default: null,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_date", updatedAt: "updated_date" },
  }
);

module.exports = mongoose.model("Teacher", teacherSchema);