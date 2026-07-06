const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // ==========================================
    // Personal Information (Tab 1)
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
    national: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["single", "married", "divorced"],
      default: "single",
    },
    id_card_number: {
      type: String,
      required: false,
      trim: true,
    
    },
    passport_number: {
      type: String,
      trim: true,
      default: "",
    },
    place_of_birth: {
      type: String,
      required: true,
      trim: true,
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
    family_contact: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // University Information (Tab 2)
    // ==========================================
    degree_level: {
      type: String,
      enum: ["certificate", "associate", "bachelor", "master", "phd"],
      required: true,
      default: "bachelor",
    },
    study_shift: {
      type: String,
      enum: ["morning", "afternoon", "evening", "weekend"],
      required: true,
      default: "morning",
    },
    major: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    know_uef: {
      type: String,
      enum: [
        "presentation",
        "brochure",
        "friends",
        "tv",
        "newspaper",
        "facebook",
        "other",
      ],
      default: "facebook",
    },
    know_uef_other: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // Education & Experience (Tab 3)
    // ==========================================
    high_school_name: {
      type: String,
      required: true,
      trim: true,
    },
    come_from_province_or_city: {
      type: String,
      required: true,
      trim: true,
    },
    level_lastest_certificat: {
      type: String,
      required: true,
      trim: true,
    },
    lastest_skill: {
      type: String,
      required: false,
      trim: true,
    },
    date_pass_exam: {
      type: String,
      trim: true,
      default: "",
    },
    certificat_number: {
      type: String,
      trim: true,
      default: "",
    },
    score_total: {
      type: String,
      trim: true,
      default: "",
    },
    score_level: {
      type: String,
      trim: true,
      default: "",
    },
    english_level: {
      type: String,
      enum: ["basic", "intermediate", "advanced"],
      default: "basic",
    },

    // Work Experience
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
    // Family Information (Tab 4)
    // ==========================================
    // Father
    family_father_name: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_name_en: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_age: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_national: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_nationality: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_job: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_company: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_contact: {
      type: String,
      trim: true,
      default: "",
    },
    family_father_present_address: {
      type: String,
      trim: true,
      default: "",
    },

    // Mother
    family_mother_name: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_name_en: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_age: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_national: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_nationality: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_job: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_company: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_contact: {
      type: String,
      trim: true,
      default: "",
    },
    family_mother_present_address: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // Other (Tab 5)
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
  },
);

module.exports = mongoose.model("Student", studentSchema);
