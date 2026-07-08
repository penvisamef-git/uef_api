const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "student-management/teacher";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // Helper function to remove password from response
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
  // CREATE - Create new teacher
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Validation - Required fields (match your model)
        const requiredFields = [
          { key: "firstname", label: "គោត្តនាម" },
          { key: "lastname", label: "នាម" },
          { key: "fullname_english", label: "ឈ្មោះពេញភាសាឡាតាំង" },
          { key: "dob", label: "ថ្ងៃខែឆ្នាំកំណើត" },
          { key: "nationality", label: "សញ្ជាតិ" },
          { key: "gender", label: "ភេទ" },
          { key: "present_address", label: "ទីលំនៅបច្ចុប្បន្ន" },
          { key: "personal_contact", label: "លេខទូរស័ព្ទ" },
          { key: "degree_level", label: "កម្រិតសិក្សា" },
          { key: "major", label: "មុខជំនាញ" },
          { key: "username", label: "ឈ្មោះអ្នកប្រើប្រាស់" },
          { key: "password", label: "ពាក្យសម្ងាត់" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field - with proper null/undefined checking
        const {
          firstname,
          lastname,
          fullname_english,
          dob,
          nationality,
          gender,
          marital_status,
          id_card_number,
          passport_number,
          present_address,
          email,
          personal_contact,
          degree_level,
          major,
          working_position,
          working_company,
          working_place,
          note,
          status,
          username,
          password,
        } = req.body;

        // Check if required fields exist before trimming
        if (!firstname || !lastname || !fullname_english || !nationality ||
          !present_address || !personal_contact || !major || !username || !password) {
          return res.status(400).json({
            success: false,
            message: "សូមបំពេញព័ត៌មានឱ្យបានពេញលេញ!",
          });
        }

        // CHECK: Check if username already exists
        const existingUsername = await Model.findOne({
          username: username.trim(),
          deleted: false
        });

        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: "ឈ្មោះអ្នកប្រើប្រាស់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            field: "username"
          });
        }

        // CHECK: Check if email already exists (if email is provided)
        if (email && email.trim()) {
          const existingEmail = await Model.findOne({
            email: email.trim().toLowerCase(),
            deleted: false
          });

          if (existingEmail) {
            return res.status(400).json({
              success: false,
              message: "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "email"
            });
          }
        }

        // CHECK: Check if ID card number already exists (if provided)
        if (id_card_number && id_card_number.trim()) {
          const existingIdCard = await Model.findOne({
            id_card_number: id_card_number.trim(),
            deleted: false
          });

          if (existingIdCard) {
            return res.status(400).json({
              success: false,
              message: "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "id_card_number"
            });
          }
        }

        // CHECK: Check if passport number already exists (if provided)
        if (passport_number && passport_number.trim()) {
          const existingPassport = await Model.findOne({
            passport_number: passport_number.trim(),
            deleted: false
          });

          if (existingPassport) {
            return res.status(400).json({
              success: false,
              message: "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "passport_number"
            });
          }
        }

        // CHECK: Check if personal contact already exists
        if (personal_contact && personal_contact.trim()) {
          const existingContact = await Model.findOne({
            personal_contact: personal_contact.trim(),
            deleted: false
          });

          if (existingContact) {
            return res.status(400).json({
              success: false,
              message: "លេខទូរស័ព្ទនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              field: "personal_contact"
            });
          }
        }

        // Hash password (if you have bcrypt)
        // const bcrypt = require("bcryptjs");
        // const saltRounds = 10;
        // const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

        // Save - with safe trimming
        const saveData = await Model.create({
          firstname: firstname ? firstname.trim() : "",
          lastname: lastname ? lastname.trim() : "",
          fullname_english: fullname_english ? fullname_english.trim() : "",
          dob: dob,
          nationality: nationality ? nationality.trim() : "",
          gender: gender,
          marital_status: marital_status || "single",
          id_card_number: id_card_number ? id_card_number.trim() : "",
          passport_number: passport_number ? passport_number.trim() : "",
          present_address: present_address ? present_address.trim() : "",
          email: email ? email.trim().toLowerCase() : "",
          personal_contact: personal_contact ? personal_contact.trim() : "",
          degree_level: degree_level,
          major: major ? major.trim() : "",
          working_position: working_position ? working_position.trim() : "",
          working_company: working_company ? working_company.trim() : "",
          working_place: working_place ? working_place.trim() : "",
          note: note ? note.trim() : "",
          status: status !== undefined ? status : true,
          username: username ? username.trim() : "",
          password: password ? password.trim() : "", // ⚠️ Should hash password!
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `គ្រូបង្រៀនថ្មី: ${firstname} ${lastname} ត្រូវបានបង្កើត!`,
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
          message: `គ្រូបង្រៀនថ្មី: ${firstname} ${lastname} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating teacher:", error);

        // Handle duplicate key error (MongoDB unique index)
        if (error.code === 11000) {
          let field = "unknown";
          let message = "ទិន្នន័យនេះមានរួចហើយក្នុងប្រព័ន្ធ!";

          if (error.keyPattern) {
            if (error.keyPattern.username) {
              field = "username";
              message = "ឈ្មោះអ្នកប្រើប្រាស់នេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.email) {
              field = "email";
              message = "អ៊ីមែលនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.id_card_number) {
              field = "id_card_number";
              message = "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.passport_number) {
              field = "passport_number";
              message = "លេខលិខិតឆ្លងដែននេះមានរួចហើយក្នុងប្រព័ន្ធ!";
            } else if (error.keyPattern.personal_contact) {
              field = "personal_contact";
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

        // Handle other errors
        return res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការបង្កើតគ្រូបង្រៀន! សូមព្យាយាមម្តងទៀត",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

        if (id) {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
            });
          }

          var data = await Model.findOne({
            _id: id,
            deleted: false,
          });

          if (!data) {
            return res.status(404).json({
              success: false,
              message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
            });
          }

          // Remove password from response
          const sanitizedData = sanitizeTeacher(data);

          return res
            .status(200)
            .json({ success: true, message: "ជោគជ័យ", data: sanitizedData });
        }
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
        });

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
        const { email, ...updateData } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
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

        // Build update object
        const updateFields = {
          ...updateData,
          updated_by: userId,
        };

        // Remove undefined fields
        Object.keys(updateFields).forEach(
          (key) => updateFields[key] === undefined && delete updateFields[key],
        );

        // Check if there's anything to update
        if (Object.keys(updateFields).length === 1) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនទិន្នន័យដែលត្រូវកែប្រែ!",
          });
        }

        // Update
        const updatedData = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
        });

        // Log
        await logActivity({
          title: `គ្រូបង្រៀន: ${updatedData.firstname} ${updatedData.lastname} ត្រូវបានកែប្រែ!`,
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

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "អ៊ីមែលនេះមានរួចហើយ!",
            error: error.message,
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
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
          title: `${teacher.firstname} ${teacher.lastname} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        // Remove password from response
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
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
          title: `${teacher.firstname} ${teacher.lastname} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "teacher_management",
          createdBy: userId,
          req,
        });

        // Remove password from response
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
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

        const teacherName = `${teacher.firstname} ${teacher.lastname}`;

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
        });

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
  // GET - Pagination
  // ==========================================
  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;

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

        // Get data
        const data = await Model.find(filter)
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
};

module.exports = route;