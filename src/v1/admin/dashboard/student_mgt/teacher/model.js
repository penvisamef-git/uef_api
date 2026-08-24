const mongoose = require("mongoose");

// ==========================================
// Sub-schemas for embedded documents
// ==========================================

// Education Sub-schema
const educationSchema = new mongoose.Schema(
  {
    degree_level_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataDegreeLevel",
      required: true,
    },
    major_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      required: true,
    },
    university_name: {
      type: String,
      required: false,
      trim: true,
    },
    university_country: {
      type: String,
      required: false,
      trim: true,
    },
    start_year: {
      type: String,
      required: false,
    },
    end_year: {
      type: String,
      required: false,
    },
    title_final_paper: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: true },
);

// Experience Work Sub-schema
const experienceSchema = new mongoose.Schema(
  {
    year_start: {
      type: String,
      required: false,
    },
    year_end: {
      type: String,
      required: false,
    },
    organization: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      required: false,
      trim: true,
    },
    job_responsibility: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ["low", "medium", "good", "excellent"],
      required: false,
    },
    file: {
      type: String,
      required: false,
    },
  },
  { _id: true },
);

// Current Other Organization Sub-schema
const otherOrganizationSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      required: false,
      trim: true,
    },
    unit: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      required: false,
      trim: true,
    },
    job_responsibility: {
      type: String,
      required: false,
      trim: true,
    },
    year_start: {
      type: Date,
      required: false,
    },
    file: {
      type: String,
      required: false,
    },
  },
  { _id: true },
);

// UEF Experience Sub-schema
const uefExperienceSchema = new mongoose.Schema(
  {
    year_start: {
      type: Date,
      required: false,
    },
    year_end: {
      type: Date,
      required: false,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    job_responsibility: {
      type: String,
      required: true,
      trim: true,
    },
    appoint_by: {
      type: String,
      required: true,
      trim: true,
    },
    job_description: {
      type: String,
      required: true,
      trim: true,
    },
    file: {
      type: String,
      required: false,
    },
  },
  { _id: true },
);

// ==========================================
// Main Teacher Schema
// ==========================================

const teacherSchema = new mongoose.Schema(
  {
    // ==========================================
    // Personal Information
    // ==========================================
    info_firstname_en: {
      type: String,
      required: true,
      trim: true,
    },
    info_lastname_en: {
      type: String,
      required: true,
      trim: true,
    },
    info_firstname_kh: {
      type: String,
      required: true,
      trim: true,
    },
    info_lastname_kh: {
      type: String,
      required: true,
      trim: true,
    },
    info_teacher_uef_id: {
      type: String,
      required: false,
      trim: true,
    },
    info_subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    info_dob: {
      type: Date,
      required: true,
    },
    info_gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    info_marital_status: {
      type: String,
      enum: ["single", "married", "divorced"],
      required: true,
    },
    info_national_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNational",
      required: true,
    },
    info_nationality_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNationality",
      required: true,
    },
    info_id_card_number: {
      type: String,
      required: true,
      trim: true,
    },
    info_email: {
      type: String,
      unique: true,
      required: false,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    info_passport_number: {
      type: String,
      required: false,
      trim: true,
    },
    info_phone_number: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // Born Address
    // ==========================================
    born_house_number: {
      type: String,
      required: false,
      trim: true,
    },
    born_street_number: {
      type: String,
      required: false,
      trim: true,
    },
    born_village_id: {
      type: String,
      required: false,
      trim: true,
    },

    born_zip_code: {
      type: String,
      required: false,
     
    },

    

    // ==========================================
    // Present Address
    // ==========================================
    address_house_number: {
      type: String,
      required: false,
      trim: true,
    },
    address_street_number: {
      type: String,
      required: false,
      trim: true,
    },
    address_village_id: {
      type: String,
      required: false,
      trim: true,
    },

        address_zip_code: {
      type: String,
      required: false,
     
    },



    

    // ==========================================
    // Education (Array of sub-documents)
    // ==========================================
    education: {
      type: [educationSchema],
      default: [],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "At least one education record is required.",
      },
    },

    // ==========================================
    // Experience Work (Array of sub-documents)
    // ==========================================
    experience: {
      type: [experienceSchema],
      default: [],
    },

    // ==========================================
    // Current Other Organization (Array of sub-documents)
    // ==========================================
    other_organizations: {
      type: [otherOrganizationSchema],
      default: [],
    },

    // ==========================================
    // UEF Experience (Array of sub-documents)
    // ==========================================
    uef_experience: {
      type: [uefExperienceSchema],
      default: [],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "At least one UEF experience record is required.",
      },
    },

    // ==========================================
    // Account
    // ==========================================
    password: {
      type: String,
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
    // Default Fields (Audit Trail)
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
    timestamps: {
      createdAt: "created_date",
      updatedAt: "updated_date",
    },
  },
);

// ==========================================
// Indexes
// ==========================================
teacherSchema.index({ info_email: 1 }, { unique: true, sparse: true });
teacherSchema.index({ info_teacher_uef_id: 1 });
teacherSchema.index({ info_subject_id: 1 });
teacherSchema.index({ "education.degree_level_id": 1 });
teacherSchema.index({ "education.major_id": 1 });

// ==========================================
// Virtuals & Methods (Optional)
// ==========================================
teacherSchema.virtual("fullName_en").get(function () {
  return `${this.info_firstname_en} ${this.info_lastname_en}`;
});

teacherSchema.virtual("fullName_kh").get(function () {
  return `${this.info_firstname_kh} ${this.info_lastname_kh}`;
});

module.exports = mongoose.model("Teacher", teacherSchema);
