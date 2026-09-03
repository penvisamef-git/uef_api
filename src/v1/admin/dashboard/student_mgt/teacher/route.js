const mongoose = require("mongoose");
const Model = require("./model");
const ModelClass = require("../../enrollment/class/model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "student-management/teacher";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const bcrypt = require("bcrypt");
// ==========================================
// Helper function to validate ObjectId
// ==========================================
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ==========================================
// Helper function to validate email
// ==========================================
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ==========================================
// Helper function to sanitize teacher data (remove password)
// ==========================================
const sanitizeTeacher = (teacher) => {
  if (!teacher) return teacher;
  const teacherObj = teacher.toObject ? teacher.toObject() : { ...teacher };
  delete teacherObj.password;
  return teacherObj;
};

const sanitizeTeachers = (teachers) => {
  if (!teachers || !Array.isArray(teachers)) return teachers;
  return teachers.map((teacher) => {
    const teacherObj = teacher.toObject ? teacher.toObject() : { ...teacher };
    delete teacherObj.password;
    return teacherObj;
  });
};

// ==========================================
// Helper function to validate arrays
// ==========================================
const validateEducationArray = (education) => {
  if (!education || !Array.isArray(education)) return false;
  return education.every((item) => {
    return item.degree_level_id && item.major_id;
  });
};

const validateUefExperienceArray = (uef_experience) => {
  if (!uef_experience || !Array.isArray(uef_experience)) return false;
  return uef_experience.every((item) => {
    return (
      item.role &&
      item.job_responsibility &&
      item.appoint_by &&
      item.job_description &&
      item.file
    );
  });
};

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new teacher
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Destructure request body
        const {
          // Personal Information
          info_firstname_en,
          info_lastname_en,
          info_firstname_kh,
          info_lastname_kh,
          info_teacher_uef_id,
          info_subject_id,
          info_dob,
          info_gender,
          info_marital_status,
          info_national_id,
          info_nationality_id,
          info_id_card_number,
          info_email,
          info_passport_number,
          info_phone_number,

          // Born Address
          born_house_number,
          born_street_number,
          born_village_id,
          born_zip_code,

          // Present Address
          address_house_number,
          address_street_number,
          address_village_id,
          address_zip_code,

          // Education (Array)
          education,

          // Experience (Array)
          experience,

          // Other Organizations (Array)
          other_organizations,

          // UEF Experience (Array)
          uef_experience,

          // Account
          password,

          // Other
          note,
          status,
        } = req.body;

        // ==========================================
        // VALIDATION CHECKS - Manual validation
        // ==========================================

        // Check required top-level fields
        const requiredFields = [
          {
            key: "info_firstname_en",
            value: info_firstname_en,
            label: "គោត្តនាម (ឡាតាំង)",
          },
          {
            key: "info_lastname_en",
            value: info_lastname_en,
            label: "នាម (ឡាតាំង)",
          },
          {
            key: "info_firstname_kh",
            value: info_firstname_kh,
            label: "គោត្តនាម (ខ្មែរ)",
          },
          {
            key: "info_lastname_kh",
            value: info_lastname_kh,
            label: "នាម (ខ្មែរ)",
          },
          { key: "info_dob", value: info_dob, label: "ថ្ងៃខែឆ្នាំកំណើត" },
          { key: "info_gender", value: info_gender, label: "ភេទ" },
          {
            key: "info_marital_status",
            value: info_marital_status,
            label: "ស្ថានភាពអាពាហ៍ពិពាហ៍",
          },
          {
            key: "info_national_id",
            value: info_national_id,
            label: "ជាតិសាសន៍",
          },
          {
            key: "info_nationality_id",
            value: info_nationality_id,
            label: "សញ្ជាតិ",
          },
          {
            key: "info_id_card_number",
            value: info_id_card_number,
            label: "លេខអត្តសញ្ញាណប័ណ្ណ",
          },
          {
            key: "info_phone_number",
            value: info_phone_number,
            label: "លេខទូរស័ព្ទ",
          },
          { key: "password", value: password, label: "ពាក្យសម្ងាត់" },
        ];

        // Check each required field
        for (const field of requiredFields) {
          if (
            !field.value ||
            (typeof field.value === "string" && !field.value.trim())
          ) {
            return res.status(400).json({
              success: false,
              message: `សូមបញ្ចូល ${field.label}`,
              field: field.key,
            });
          }
        }

        // ==========================================
        // VALIDATE EDUCATION ARRAY
        // ==========================================

        // Check if education exists and is an array
        if (!education || !Array.isArray(education) || education.length === 0) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ចូលព័ត៌មានសិក្សាយ៉ាងហោចណាស់មួយ!",
            field: "education",
          });
        }

        // Validate each education item
        for (let i = 0; i < education.length; i++) {
          const edu = education[i];

          // Check required fields in education
          if (!edu.degree_level_id) {
            return res.status(400).json({
              success: false,
              message: `ព័ត៌មានសិក្សាលេខ ${i + 1}: សូមបញ្ចូលកម្រិតសិក្សា!`,
              field: `education[${i}].degree_level_id`,
            });
          }

          if (!edu.major_id) {
            return res.status(400).json({
              success: false,
              message: `ព័ត៌មានសិក្សាលេខ ${i + 1}: សូមបញ្ចូលមុខជំនាញ!`,
              field: `education[${i}].major_id`,
            });
          }
        }

        // ==========================================
        // VALIDATE UEF EXPERIENCE ARRAY
        // ==========================================

        // Check if uef_experience exists and is an array
        if (
          !uef_experience ||
          !Array.isArray(uef_experience) ||
          uef_experience.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ចូលព័ត៌មានបទពិសោធន៍នៅ UEF យ៉ាងហោចណាស់មួយ!",
            field: "uef_experience",
          });
        }

        // Validate each UEF experience item
        for (let i = 0; i < uef_experience.length; i++) {
          const uef = uef_experience[i];

          // Check required fields in UEF experience
          if (!uef.role || !uef.role.trim()) {
            return res.status(400).json({
              success: false,
              message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលតួនាទី!`,
              field: `uef_experience[${i}].role`,
            });
          }

          if (!uef.job_responsibility || !uef.job_responsibility.trim()) {
            return res.status(400).json({
              success: false,
              message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលទំនួលខុសត្រូវការងារ!`,
              field: `uef_experience[${i}].job_responsibility`,
            });
          }

          if (!uef.appoint_by || !uef.appoint_by.trim()) {
            return res.status(400).json({
              success: false,
              message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលអ្នកតែងតាំង!`,
              field: `uef_experience[${i}].appoint_by`,
            });
          }

          if (!uef.job_description || !uef.job_description.trim()) {
            return res.status(400).json({
              success: false,
              message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលការពិពណ៌នាការងារ!`,
              field: `uef_experience[${i}].job_description`,
            });
          }
        }

        // ==========================================
        // VALIDATE EXPERIENCE ARRAY (Optional but validate if provided)
        // ==========================================

        if (experience && Array.isArray(experience) && experience.length > 0) {
          for (let i = 0; i < experience.length; i++) {
            const exp = experience[i];

            // Check if required fields in experience (optional but if provided, validate)
            if (exp.organization && !exp.organization.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ការងារលេខ ${i + 1}: ឈ្មោះអង្គការមិនត្រឹមត្រូវ!`,
                field: `experience[${i}].organization`,
              });
            }
          }
        }

        // ==========================================
        // UNIQUENESS CHECKS
        // ==========================================

        // CHECK: Check if username exists (using teacher_uef_id as username)
        if (info_teacher_uef_id && info_teacher_uef_id.trim()) {
          const existingUsername = await Model.findOne({
            info_teacher_uef_id: info_teacher_uef_id.trim(),
            deleted: false,
          });
          if (existingUsername) {
            return res.status(400).json({
              success: false,
              message: "លេខអត្តសញ្ញាណ UEF នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "info_teacher_uef_id",
            });
          }
        }

        // CHECK: Check if email exists
        if (info_email && info_email.trim()) {
          const existingEmail = await Model.findOne({
            info_email: info_email.trim().toLowerCase(),
            deleted: false,
          });
          if (existingEmail) {
            return res.status(400).json({
              success: false,
              message: "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "info_email",
            });
          }
        }

        // CHECK: Check if ID card number exists
        if (info_id_card_number && info_id_card_number.trim()) {
          const existingIdCard = await Model.findOne({
            info_id_card_number: info_id_card_number.trim(),
            deleted: false,
          });
          if (existingIdCard) {
            return res.status(400).json({
              success: false,
              message: "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "info_id_card_number",
            });
          }
        }

        // CHECK: Check if passport number exists
        if (info_passport_number && info_passport_number.trim()) {
          const existingPassport = await Model.findOne({
            info_passport_number: info_passport_number.trim(),
            deleted: false,
          });
          if (existingPassport) {
            return res.status(400).json({
              success: false,
              message: "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "info_passport_number",
            });
          }
        }

        // CHECK: Check if phone number exists
        if (info_phone_number && info_phone_number.trim()) {
          const existingPhone = await Model.findOne({
            info_phone_number: info_phone_number.trim(),
            deleted: false,
          });
          if (existingPhone) {
            return res.status(400).json({
              success: false,
              message: "លេខទូរស័ព្ទនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "info_phone_number",
            });
          }
        }

        // ==========================================
        // HASH PASSWORD
        // ==========================================
        const bcrypt = require("bcrypt");
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

        // ==========================================
        // CREATE TEACHER
        // ==========================================
        const saveData = await Model.create({
          // Personal Information
          info_firstname_en: info_firstname_en.trim(),
          info_lastname_en: info_lastname_en.trim(),
          info_firstname_kh: info_firstname_kh.trim(),
          info_lastname_kh: info_lastname_kh.trim(),
          info_teacher_uef_id: info_teacher_uef_id
            ? info_teacher_uef_id.trim()
            : "",
          info_subject_id: info_subject_id || null,
          info_dob: new Date(info_dob),
          info_gender: info_gender,
          info_marital_status: info_marital_status,
          info_national_id: info_national_id,
          info_nationality_id: info_nationality_id,
          info_id_card_number: info_id_card_number.trim(),
          info_email: info_email ? info_email.trim().toLowerCase() : "",
          info_passport_number: info_passport_number.trim(),
          info_phone_number: info_phone_number.trim(),

          // Born Address
          born_house_number: born_house_number ? born_house_number.trim() : "",
          born_street_number: born_street_number
            ? born_street_number.trim()
            : "",
          born_village_id: born_village_id ? born_village_id.trim() : "",
          born_zip_code: born_zip_code ? born_zip_code.trim() : "",

          // Present Address
          address_house_number: address_house_number
            ? address_house_number.trim()
            : "",
          address_street_number: address_street_number
            ? address_street_number.trim()
            : "",
          address_village_id: address_village_id
            ? address_village_id.trim()
            : "",
          address_zip_code: address_zip_code ? address_zip_code.trim() : "",

          // Education (Array)
          education: education || [],

          // Experience (Array)
          experience: experience || [],

          // Other Organizations (Array)
          other_organizations: other_organizations || [],

          // UEF Experience (Array)
          uef_experience: uef_experience || [],

          // Account - Store hashed password
          password: hashedPassword,

          // Other
          note: note ? note.trim() : "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `គ្រូបង្រៀនថ្មី: ${info_firstname_en} ${info_lastname_en} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        // Remove password from response
        const sanitizedData = sanitizeTeacher(saveData);

        return res.status(200).json({
          success: true,
          data: sanitizedData,
          message: `គ្រូបង្រៀនថ្មី: ${info_firstname_en} ${info_lastname_en} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating teacher:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          let field = "unknown";
          let message = "ទិន្នន័យនេះមានរួចហើយក្នុងប្រព័ន្ធ!";

          if (error.keyPattern) {
            if (error.keyPattern.info_teacher_uef_id) {
              field = "info_teacher_uef_id";
              message = "លេខអត្តសញ្ញាណ UEF នេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_email) {
              field = "info_email";
              message = "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_id_card_number) {
              field = "info_id_card_number";
              message = "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_passport_number) {
              field = "info_passport_number";
              message = "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_phone_number) {
              field = "info_phone_number";
              message = "លេខទូរស័ព្ទនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            }
          }

          return res.status(400).json({
            success: false,
            message: message,
            field: field,
            error: error.message,
          });
        }

        // Handle validation error
        if (error.name === "ValidationError") {
          const errors = {};
          for (const field in error.errors) {
            errors[field] = error.errors[field].message;
          }
          return res.status(400).json({
            success: false,
            message: "សូមពិនិត្យទិន្នន័យរបស់អ្នក!",
            errors: errors,
          });
        }

        return res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការបង្កើតគ្រូបង្រៀន! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  prop.app.put(
    `${urlAPI}-update-password-no-token/for-teacher/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;

        const requiredFields = [
          { key: "password", label: "ពាក្យសម្ងាត់" },
          { key: "info_email", label: "email" },
        ];
        checkValidtion(res, req, requiredFields);

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: noIDFound,
          });
        }

        // check user
        const teacherData = await Model.findOne({
          _id: id,
        });

        if (!teacherData) {
          return res.status(400).json({
            success: false,
            message: noIDFound,
          });
        }

        if (teacherData.info_email !== req.body.info_email) {
          return res.status(400).json({
            success: false,
            message: "Invalid Email",
          });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        const updatedData = await Model.findByIdAndUpdate(
          id,
          { password: hashedPassword },
          {
            new: true,
            runValidators: true,
          },
        );

        if (!updatedData) {
          return res.status(404).json({
            success: false,
            message: noDataFound,
          });
        }

        res.status(200).json({
          success: true,
          data: updatedData,
          message: `ពាក្យសម្ងាត់របស់ ${updatedData.info_firstname_kh || ""} ${updatedData.info_lastname_kh || ""} បានកែប្រែដោយជោគជ័យ!`,
        });
      } catch (err) {
        console.error("❌ Error updating password:", err);
        res.status(500).json({
          success: false,
          message: serverError,
          error: err.message,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single teacher
  // ==========================================
  prop.app.get(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        var data = await Model.findOne({
          _id: id,
          deleted: false,
        })
          .populate("info_subject_id")
          .populate("info_national_id")
          .populate("info_nationality_id")
          .populate("education.degree_level_id")
          .populate("education.major_id");

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Remove password from response
        const sanitizedData = sanitizeTeacher(data);

        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: sanitizedData,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Internal Error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET ALL - Get all teachers
  // ==========================================
  prop.app.get(
    `${urlAPI}-all`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({
          deleted: false,
        })
          .populate("info_subject_id", "name")
          .populate("info_national_id", "name")
          .populate("info_nationality_id", "name");

        // Remove passwords from response
        const sanitizedData = sanitizeTeachers(result);

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: sanitizedData.length,
          data: sanitizedData,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // UPDATE - Update teacher
  // ==========================================
  prop.app.put(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: user_data } = req.session;

        // Validate ID
        if (!isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: "ID មិនត្រឹមត្រូវ",
          });
        }

        // Check if teacher exists
        const existingTeacher = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingTeacher) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Destructure update fields
        const {
          // Personal Information
          info_firstname_en,
          info_lastname_en,
          info_firstname_kh,
          info_lastname_kh,
          info_teacher_uef_id,
          info_subject_id,
          info_dob,
          info_gender,
          info_marital_status,
          info_national_id,
          info_nationality_id,
          info_id_card_number,
          info_email,
          info_passport_number,
          info_phone_number,

          // Born Address
          born_house_number,
          born_street_number,
          born_village_id,
          born_zip_code,

          // Present Address
          address_house_number,
          address_street_number,
          address_village_id,
          address_zip_code,

          // Education (Array)
          education,

          // Experience (Array)
          experience,

          // Other Organizations (Array)
          other_organizations,

          // UEF Experience (Array)
          uef_experience,

          // Account
          password,

          // Other
          note,
          status,
        } = req.body;

        // ==========================================
        // VALIDATION FOR ARRAYS
        // ==========================================

        // Validate Education array if provided
        if (education !== undefined) {
          if (!Array.isArray(education)) {
            return res.status(400).json({
              success: false,
              message: "ព័ត៌មានសិក្សាត្រូវតែជា Array!",
              field: "education",
            });
          }

          if (education.length === 0) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូលព័ត៌មានសិក្សាយ៉ាងហោចណាស់មួយ!",
              field: "education",
            });
          }

          // Validate each education item
          for (let i = 0; i < education.length; i++) {
            const edu = education[i];
            if (!edu.degree_level_id) {
              return res.status(400).json({
                success: false,
                message: `ព័ត៌មានសិក្សាលេខ ${i + 1}: សូមបញ្ចូលកម្រិតសិក្សា!`,
                field: `education[${i}].degree_level_id`,
              });
            }
            if (!edu.major_id) {
              return res.status(400).json({
                success: false,
                message: `ព័ត៌មានសិក្សាលេខ ${i + 1}: សូមបញ្ចូលមុខជំនាញ!`,
                field: `education[${i}].major_id`,
              });
            }
            if (!edu.university_name) {
              return res.status(400).json({
                success: false,
                message: `ព័ត៌មានសិក្សាលេខ ${i + 1}: សូមបញ្ចូលឈ្មោះសាកលវិទ្យាល័យ!`,
                field: `education[${i}].university_name`,
              });
            }
          }
        }

        // Validate UEF Experience array if provided
        if (uef_experience !== undefined) {
          if (!Array.isArray(uef_experience)) {
            return res.status(400).json({
              success: false,
              message: "ព័ត៌មានបទពិសោធន៍ UEF ត្រូវតែជា Array!",
              field: "uef_experience",
            });
          }

          if (uef_experience.length === 0) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូលព័ត៌មានបទពិសោធន៍នៅ UEF យ៉ាងហោចណាស់មួយ!",
              field: "uef_experience",
            });
          }

          // Validate each UEF experience item
          for (let i = 0; i < uef_experience.length; i++) {
            const uef = uef_experience[i];
            if (!uef.role || !uef.role.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលតួនាទី!`,
                field: `uef_experience[${i}].role`,
              });
            }
            if (!uef.job_responsibility || !uef.job_responsibility.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលទំនួលខុសត្រូវការងារ!`,
                field: `uef_experience[${i}].job_responsibility`,
              });
            }
            if (!uef.appoint_by || !uef.appoint_by.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលអ្នកតែងតាំង!`,
                field: `uef_experience[${i}].appoint_by`,
              });
            }
            if (!uef.job_description || !uef.job_description.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលការពិពណ៌នាការងារ!`,
                field: `uef_experience[${i}].job_description`,
              });
            }
            if (!uef.file || !uef.file.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ UEF លេខ ${i + 1}: សូមបញ្ចូលឯកសារ!`,
                field: `uef_experience[${i}].file`,
              });
            }
          }
        }

        // Validate Experience array if provided
        if (experience !== undefined) {
          if (!Array.isArray(experience)) {
            return res.status(400).json({
              success: false,
              message: "បទពិសោធន៍ការងារត្រូវតែជា Array!",
              field: "experience",
            });
          }

          // Validate each experience item (if has data)
          for (let i = 0; i < experience.length; i++) {
            const exp = experience[i];
            if (exp.organization && !exp.organization.trim()) {
              return res.status(400).json({
                success: false,
                message: `បទពិសោធន៍ការងារលេខ ${i + 1}: ឈ្មោះអង្គការមិនត្រឹមត្រូវ!`,
                field: `experience[${i}].organization`,
              });
            }
          }
        }

        // Validate Other Organizations array if provided
        if (other_organizations !== undefined) {
          if (!Array.isArray(other_organizations)) {
            return res.status(400).json({
              success: false,
              message: "អង្គការផ្សេងទៀតត្រូវតែជា Array!",
              field: "other_organizations",
            });
          }
        }

        // ==========================================
        // UNIQUENESS CHECKS (if fields are being updated)
        // ==========================================

        // Build update object
        const updateFields = {
          updated_by: userId,
        };

        // Add fields only if they are provided
        if (info_firstname_en !== undefined) {
          if (!info_firstname_en.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល គោត្តនាម (ឡាតាំង)!",
              field: "info_firstname_en",
            });
          }
          updateFields.info_firstname_en = info_firstname_en.trim();
        }

        if (info_lastname_en !== undefined) {
          if (!info_lastname_en.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល នាម (ឡាតាំង)!",
              field: "info_lastname_en",
            });
          }
          updateFields.info_lastname_en = info_lastname_en.trim();
        }

        if (info_firstname_kh !== undefined) {
          if (!info_firstname_kh.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល គោត្តនាម (ខ្មែរ)!",
              field: "info_firstname_kh",
            });
          }
          updateFields.info_firstname_kh = info_firstname_kh.trim();
        }

        if (info_lastname_kh !== undefined) {
          if (!info_lastname_kh.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល នាម (ខ្មែរ)!",
              field: "info_lastname_kh",
            });
          }
          updateFields.info_lastname_kh = info_lastname_kh.trim();
        }

        // Check teacher_uef_id (username) uniqueness
        if (info_teacher_uef_id !== undefined) {
          if (!info_teacher_uef_id.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល លេខអត្តសញ្ញាណ UEF!",
              field: "info_teacher_uef_id",
            });
          }

          if (
            info_teacher_uef_id.trim() !== existingTeacher.info_teacher_uef_id
          ) {
            const exists = await Model.findOne({
              info_teacher_uef_id: info_teacher_uef_id.trim(),
              deleted: false,
              _id: { $ne: id },
            });
            if (exists) {
              return res.status(400).json({
                success: false,
                message: "លេខអត្តសញ្ញាណ UEF នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
                field: "info_teacher_uef_id",
              });
            }
            updateFields.info_teacher_uef_id = info_teacher_uef_id.trim();
          }
        }

        // Check subject
        if (info_subject_id !== undefined) {
          if (info_subject_id && !isValidObjectId(info_subject_id)) {
            return res.status(400).json({
              success: false,
              message: "មុខវិជ្ជាមិនត្រឹមត្រូវ!",
              field: "info_subject_id",
            });
          }
          updateFields.info_subject_id = info_subject_id || null;
        }

        // Check DOB
        if (info_dob !== undefined) {
          if (!info_dob) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល ថ្ងៃខែឆ្នាំកំណើត!",
              field: "info_dob",
            });
          }
          const dobDate = new Date(info_dob);
          if (isNaN(dobDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "ថ្ងៃខែឆ្នាំកំណើតមិនត្រឹមត្រូវ!",
              field: "info_dob",
            });
          }
          updateFields.info_dob = dobDate;
        }

        // Check gender
        if (info_gender !== undefined) {
          if (!["male", "female"].includes(info_gender)) {
            return res.status(400).json({
              success: false,
              message: "ភេទត្រូវតែជា 'male' ឬ 'female'!",
              field: "info_gender",
            });
          }
          updateFields.info_gender = info_gender;
        }

        // Check marital status
        if (info_marital_status !== undefined) {
          if (
            !["single", "married", "divorced"].includes(info_marital_status)
          ) {
            return res.status(400).json({
              success: false,
              message: "ស្ថានភាពអាពាហ៍ពិពាហ៍មិនត្រឹមត្រូវ!",
              field: "info_marital_status",
            });
          }
          updateFields.info_marital_status = info_marital_status;
        }

        // Check national
        if (info_national_id !== undefined) {
          if (!info_national_id) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល ជាតិសាសន៍!",
              field: "info_national_id",
            });
          }
          if (!isValidObjectId(info_national_id)) {
            return res.status(400).json({
              success: false,
              message: "ជាតិសាសន៍មិនត្រឹមត្រូវ!",
              field: "info_national_id",
            });
          }
          updateFields.info_national_id = info_national_id;
        }

        // Check nationality
        if (info_nationality_id !== undefined) {
          if (!info_nationality_id) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល សញ្ជាតិ!",
              field: "info_nationality_id",
            });
          }
          if (!isValidObjectId(info_nationality_id)) {
            return res.status(400).json({
              success: false,
              message: "សញ្ជាតិមិនត្រឹមត្រូវ!",
              field: "info_nationality_id",
            });
          }
          updateFields.info_nationality_id = info_nationality_id;
        }

        // Check ID card number uniqueness
        if (info_id_card_number !== undefined) {
          if (!info_id_card_number.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល លេខអត្តសញ្ញាណប័ណ្ណ!",
              field: "info_id_card_number",
            });
          }

          if (
            info_id_card_number.trim() !== existingTeacher.info_id_card_number
          ) {
            const exists = await Model.findOne({
              info_id_card_number: info_id_card_number.trim(),
              deleted: false,
              _id: { $ne: id },
            });
            if (exists) {
              return res.status(400).json({
                success: false,
                message: "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
                field: "info_id_card_number",
              });
            }
            updateFields.info_id_card_number = info_id_card_number.trim();
          }
        }

        // Check email uniqueness
        if (info_email !== undefined) {
          const emailTrimmed = info_email.trim();

          if (emailTrimmed && !isValidEmail(emailTrimmed)) {
            return res.status(400).json({
              success: false,
              message: "អ៊ីមែលមិនត្រឹមត្រូវ!",
              field: "info_email",
            });
          }

          if (emailTrimmed && emailTrimmed !== existingTeacher.info_email) {
            const exists = await Model.findOne({
              info_email: emailTrimmed.toLowerCase(),
              deleted: false,
              _id: { $ne: id },
            });
            if (exists) {
              return res.status(400).json({
                success: false,
                message: "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
                field: "info_email",
              });
            }
            updateFields.info_email = emailTrimmed.toLowerCase();
          } else if (!emailTrimmed) {
            updateFields.info_email = "";
          }
        }

        // Check passport number uniqueness
        if (info_passport_number !== undefined) {
          if (!info_passport_number.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល លេខលិខិតឆ្លងដែន!",
              field: "info_passport_number",
            });
          }

          if (
            info_passport_number.trim() !== existingTeacher.info_passport_number
          ) {
            const exists = await Model.findOne({
              info_passport_number: info_passport_number.trim(),
              deleted: false,
              _id: { $ne: id },
            });
            if (exists) {
              return res.status(400).json({
                success: false,
                message: "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!",
                field: "info_passport_number",
              });
            }
            updateFields.info_passport_number = info_passport_number.trim();
          }
        }

        // Check phone number uniqueness
        if (info_phone_number !== undefined) {
          if (!info_phone_number.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល លេខទូរស័ព្ទ!",
              field: "info_phone_number",
            });
          }

          if (info_phone_number.trim() !== existingTeacher.info_phone_number) {
            const exists = await Model.findOne({
              info_phone_number: info_phone_number.trim(),
              deleted: false,
              _id: { $ne: id },
            });
            if (exists) {
              return res.status(400).json({
                success: false,
                message: "លេខទូរស័ព្ទនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
                field: "info_phone_number",
              });
            }
            updateFields.info_phone_number = info_phone_number.trim();
          }
        }

        // Address fields
        if (born_house_number !== undefined)
          updateFields.born_house_number = born_house_number
            ? born_house_number.trim()
            : "";
        if (born_street_number !== undefined)
          updateFields.born_street_number = born_street_number
            ? born_street_number.trim()
            : "";
        if (born_village_id !== undefined)
          updateFields.born_village_id = born_village_id
            ? born_village_id.trim()
            : "";
        if (born_zip_code !== undefined)
          updateFields.born_zip_code = born_zip_code
            ? born_zip_code.trim()
            : "";
        if (address_house_number !== undefined)
          updateFields.address_house_number = address_house_number
            ? address_house_number.trim()
            : "";
        if (address_street_number !== undefined)
          updateFields.address_street_number = address_street_number
            ? address_street_number.trim()
            : "";
        if (address_village_id !== undefined)
          updateFields.address_village_id = address_village_id
            ? address_village_id.trim()
            : "";
        if (address_zip_code !== undefined)
          updateFields.address_zip_code = address_zip_code
            ? address_zip_code.trim()
            : "";

        // Arrays
        if (education !== undefined) {
          updateFields.education = education;
        }

        if (experience !== undefined) {
          updateFields.experience = experience;
        }

        if (other_organizations !== undefined) {
          updateFields.other_organizations = other_organizations;
        }

        if (uef_experience !== undefined) {
          updateFields.uef_experience = uef_experience;
        }

        // Password (if provided)
        if (password !== undefined) {
          if (!password.trim()) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូល ពាក្យសម្ងាត់!",
              field: "password",
            });
          }
          if (password.trim().length < 6) {
            return res.status(400).json({
              success: false,
              message: "ពាក្យសម្ងាត់ត្រូវតែមានយ៉ាងហោចណាស់ 6 តួអក្សរ!",
              field: "password",
            });
          }
          updateFields.password = password.trim();
        }

        if (note !== undefined) {
          updateFields.note = note ? note.trim() : "";
        }

        if (status !== undefined) {
          if (typeof status !== "boolean") {
            return res.status(400).json({
              success: false,
              message: "ស្ថានភាពត្រូវតែជា true ឬ false!",
              field: "status",
            });
          }
          updateFields.status = status;
        }

        // Check if there's anything to update
        if (Object.keys(updateFields).length === 1) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនទិន្នន័យដែលត្រូវកែប្រែ!",
          });
        }

        // ==========================================
        // UPDATE TEACHER
        // ==========================================

        const updatedData = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
          runValidators: true,
        })
          .populate("info_subject_id")
          .populate("info_national_id")
          .populate("info_nationality_id")
          .populate("education.degree_level_id")
          .populate("education.major_id");

        // Log
        await logActivity({
          title: `គ្រូបង្រៀន: ${updatedData.info_firstname_en} ${updatedData.info_lastname_en} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        // Remove password from response
        const sanitizedData = sanitizeTeacher(updatedData);

        res.status(200).json({
          success: true,
          data: sanitizedData,
          message: "ព័ត៌មានគ្រូបង្រៀនត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating teacher:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          let field = "unknown";
          let message = "ទិន្នន័យនេះមានរួចហើយក្នុងប្រព័ន្ធ!";

          if (error.keyPattern) {
            if (error.keyPattern.info_teacher_uef_id) {
              field = "info_teacher_uef_id";
              message = "លេខអត្តសញ្ញាណ UEF នេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_email) {
              field = "info_email";
              message = "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_id_card_number) {
              field = "info_id_card_number";
              message = "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_passport_number) {
              field = "info_passport_number";
              message = "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.info_phone_number) {
              field = "info_phone_number";
              message = "លេខទូរស័ព្ទនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            }
          }

          return res.status(400).json({
            success: false,
            message: message,
            field: field,
            error: error.message,
          });
        }

        // Handle validation error
        if (error.name === "ValidationError") {
          const errors = {};
          for (const field in error.errors) {
            errors[field] = error.errors[field].message;
          }
          return res.status(400).json({
            success: false,
            message: "សូមពិនិត្យទិន្នន័យរបស់អ្នក!",
            errors: errors,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែព័ត៌មានគ្រូបង្រៀន!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete teacher
  // ==========================================
  prop.app.delete(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: user_data } = req.session;

        if (!isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        const teacher = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        const updatedTeacher = await Model.findByIdAndUpdate(
          id,
          {
            deleted: true,
            deleted_at: new Date(),
            deleted_by: userId,
            updated_by: userId,
          },
          { new: true },
        );

        await logActivity({
          title: `${teacher.info_firstname_en} ${teacher.info_lastname_en} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        const sanitizedData = sanitizeTeacher(updatedTeacher);

        res.status(200).json({
          success: true,
          data: sanitizedData,
          message: "ទិន្នន័យត្រូវបានផ្លាស់ទៅធុងសំរាម!",
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការលុបទិន្នន័យ!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // RESTORE - Restore soft deleted teacher
  // ==========================================
  prop.app.put(
    `${urlAPI}/restore/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: user_data } = req.session;

        if (!isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        const teacher = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        const restoredTeacher = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        );

        await logActivity({
          title: `${teacher.info_firstname_en} ${teacher.info_lastname_en} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        const sanitizedData = sanitizeTeacher(restoredTeacher);

        res.status(200).json({
          success: true,
          data: sanitizedData,
          message: "ទិន្នន័យត្រូវបានស្ដារមកវិញ!",
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការស្ដារទិន្នន័យ!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // DELETE FOREVER - Permanently delete teacher
  // ==========================================
  prop.app.delete(
    `${urlAPI}/forever/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: user_data } = req.session;

        if (!isValidObjectId(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        const teacher = await Model.findOne({
          _id: id,
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        const teacherName = `${teacher.info_firstname_en} ${teacher.info_lastname_en}`;

        await Model.findByIdAndDelete(id);

        await logActivity({
          title: `${teacherName} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          message: "ទិន្នន័យត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!",
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការលុបទិន្នន័យជាអចិន្ត្រៃយ៍!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET TRASH - Get all soft deleted teachers
  // ==========================================
  prop.app.get(
    `${urlAPI}-trash`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({
          deleted: true,
        })
          .populate("info_subject_id", "name")
          .populate("info_national_id", "name")
          .populate("info_nationality_id", "name");

        const sanitizedData = sanitizeTeachers(result);

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: sanitizedData.length,
          data: sanitizedData,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET - Pagination
  // ==========================================
  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Build query for filtering
        const { q, q_key, page, limit, sort, order } = req.query;

        // Build filter
        let filter = { deleted: false };

        // Handle search
        if (q && q_key) {
          const searchKeys = JSON.parse(q_key);
          const searchConditions = searchKeys.map((key) => ({
            [key]: { $regex: q, $options: "i" },
          }));
          filter.$or = searchConditions;
        }

        // Handle sort
        const sortField = sort || "created_date";
        const sortOrder = order === "asc" ? 1 : -1;

        // Handle pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await Model.countDocuments(filter);

        // Get data with populated fields
        const data = await Model.find(filter)
          .populate("info_subject_id", "name")
          .populate("info_national_id", "name")
          .populate("info_nationality_id", "name")
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum);

        const totalPages = Math.ceil(total / limitNum);

        // Remove passwords from response
        const sanitizedData = sanitizeTeachers(data);

        res.status(200).json({
          success: true,
          data: sanitizedData,
          pagination: {
            total: total,
            totalPages: totalPages,
            currentPage: pageNum,
            pageSize: limitNum,
          },
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({
          success: false,
          message: err.message || "Server error",
        });
      }
    },
  );

  // ============================
  // Get Class by Teacher
};

module.exports = route;
