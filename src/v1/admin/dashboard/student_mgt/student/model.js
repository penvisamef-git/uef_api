const mongoose = require("mongoose");

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
    firstname_english: {
      type: String,
      required: true,
      trim: true,
    },

    lastname_english: {
      type: String,
      required: true,
      trim: true,
    },

    uef_code_id_card_number: {
      type: String,
      required: false,
    },
    dob: {
      type: Date,
      required: true,
    },

    national_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNational",
      required: true,
    },
    nationality_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNationality",
      required: true,
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

    experience: {
      type: [experienceSchema],
      default: [],
    },

    // ==========================================
    // University Information (Tab 2)
    // ==========================================
    degree_level_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataDegreeLevel",
      required: true,
    },

    shift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataShift",
      required: true,
    },

    major_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
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



    family_father_address_house_number: {
      type: String,
      required: false,
      trim: true,
    },
     family_father_address_street_number: {
      type: String,
      required: false,
      trim: true,
    },
     family_father_address_village_id: {
      type: String,
      required: false,
      trim: true,
    },

         family_father_address_zip_code: {
      type: String,
      required: false,
     
    },

       family_father_national_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNational",
      required: false,
    },
    family_father_nationality_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNationality",
      required: false,
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

     family_mother_address_house_number: {
      type: String,
      required: false,
      trim: true,
    },
     family_mother_address_street_number: {
      type: String,
      required: false,
      trim: true,
    },
     family_mother_address_village_id: {
      type: String,
      required: false,
      trim: true,
    },

         family_mother_address_zip_code: {
      type: String,
      required: false,
     
    },



    
      family_mother_national_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNational",
      required: false,
    },
    family_mother_nationality_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataNationality",
      required: false,
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
