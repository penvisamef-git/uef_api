const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "student-management/student";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new student
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Validation - Required fields
        const requiredFields = [
          { key: "firstname", label: "គោត្តនាម" },
          { key: "lastname", label: "នាម" },
          { key: "fullname_english", label: "ឈ្មោះពេញភាសាឡាតាំង" },
          { key: "dob", label: "ថ្ងៃខែឆ្នាំកំណើត" },
          { key: "national", label: "ជនជាតិ" },
          { key: "nationality", label: "សញ្ជាតិ" },
          { key: "gender", label: "ភេទ" },
          { key: "id_card_number", label: "លេខអត្តសញ្ញាណប័ណ្ណ" },
          { key: "place_of_birth", label: "ទីកន្លែងកំណើត" },
          { key: "present_address", label: "ទីលំនៅបច្ចុប្បន្ន" },
          { key: "personal_contact", label: "លេខទូរស័ព្ទផ្ទាល់ខ្លួន" },
          { key: "high_school_name", label: "ឈ្មោះវិទ្យាល័យ" },
          { key: "come_from_province_or_city", label: "មកពីរខេត្ត" },
          { key: "level_lastest_certificat", label: "កម្រិតសញ្ញាបត្រចុងក្រោយ" },
          { key: "lastest_skill", label: "ជំនាញ" },
          { key: "major", label: "មុខជំនាញ" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const {
          firstname,
          lastname,
          fullname_english,
          dob,
          national,
          nationality,
          gender,
          marital_status,
          id_card_number,
          passport_number,
          place_of_birth,
          present_address,
          email,
          personal_contact,
          family_contact,
          degree_level,
          study_shift,
          major,
          know_uef,
          know_uef_other,
          high_school_name,
          come_from_province_or_city,
          level_lastest_certificat,
          lastest_skill,
          date_pass_exam,
          certificat_number,
          score_total,
          score_level,
          english_level,
          working_position,
          working_company,
          working_place,
          family_father_name,
          family_father_name_en,
          family_father_age,
          family_father_national,
          family_father_nationality,
          family_father_job,
          family_father_company,
          family_father_contact,
          family_father_present_address,
          family_mother_name,
          family_mother_name_en,
          family_mother_age,
          family_mother_national,
          family_mother_nationality,
          family_mother_job,
          family_mother_company,
          family_mother_contact,
          family_mother_present_address,
          note,
          status,
        } = req.body;

        // Save
        const saveData = await Model.create({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          fullname_english: fullname_english.trim(),
          dob: dob,
          national: national.trim(),
          nationality: nationality.trim(),
          gender: gender,
          marital_status: marital_status || "single",
          id_card_number: id_card_number.trim(),
          passport_number: passport_number || "",
          place_of_birth: place_of_birth.trim(),
          present_address: present_address.trim(),
          email: email || "",
          personal_contact: personal_contact.trim(),
          family_contact: family_contact || "",
          degree_level: degree_level || "bachelor",
          study_shift: study_shift || "morning",
          major: major,
          know_uef: know_uef || "facebook",
          know_uef_other: know_uef_other || "",
          high_school_name: high_school_name.trim(),
          come_from_province_or_city: come_from_province_or_city.trim(),
          level_lastest_certificat: level_lastest_certificat.trim(),
          lastest_skill: lastest_skill.trim(),
          date_pass_exam: date_pass_exam || "",
          certificat_number: certificat_number || "",
          score_total: score_total || "",
          score_level: score_level || "",
          english_level: english_level || "basic",
          working_position: working_position || "",
          working_company: working_company || "",
          working_place: working_place || "",
          family_father_name: family_father_name || "",
          family_father_name_en: family_father_name_en || "",
          family_father_age: family_father_age || "",
          family_father_national: family_father_national || "",
          family_father_nationality: family_father_nationality || "",
          family_father_job: family_father_job || "",
          family_father_company: family_father_company || "",
          family_father_contact: family_father_contact || "",
          family_father_present_address: family_father_present_address || "",
          family_mother_name: family_mother_name || "",
          family_mother_name_en: family_mother_name_en || "",
          family_mother_age: family_mother_age || "",
          family_mother_national: family_mother_national || "",
          family_mother_nationality: family_mother_nationality || "",
          family_mother_job: family_mother_job || "",
          family_mother_company: family_mother_company || "",
          family_mother_contact: family_mother_contact || "",
          family_mother_present_address: family_mother_present_address || "",
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `និស្សិតថ្មី: ${firstname} ${lastname} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "student_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `និស្សិតថ្មី: ${firstname} ${lastname} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating student:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

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
          message: "មានបញ្ហាក្នុងការបង្កើតនិស្សិត! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single student
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
          }).populate("major", "name");

          if (!data) {
            return res.status(404).json({
              success: false,
              message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
            });
          }

          return res
            .status(200)
            .json({ success: true, message: "ជោគជ័យ", data: data });
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
  // GET ALL - Get all students
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
        }).populate("major", "name");

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: result.length,
          data: result,
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
  // UPDATE - Update student
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
        const { id_card_number, ...updateData } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if student exists
        const existingStudent = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingStudent) {
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
          title: `និស្សិត: ${updatedData.firstname} ${updatedData.lastname} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "student_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ព័ត៌មាននិស្សិតត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating student:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "លេខអត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែព័ត៌មាននិស្សិត!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete student
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

        const student = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        const updatedStudent = await Model.findByIdAndUpdate(
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
          title: `${student.firstname} ${student.lastname} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "student_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedStudent,
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
  // RESTORE - Restore soft deleted student
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

        const student = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        const restoredStudent = await Model.findByIdAndUpdate(
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
          title: `${student.firstname} ${student.lastname} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "student_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredStudent,
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
  // DELETE FOREVER - Permanently delete student
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

        const student = await Model.findOne({
          _id: id,
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        const studentName = `${student.firstname} ${student.lastname}`;

        await Model.findByIdAndDelete(id);

        await logActivity({
          title: `${studentName} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "student_management",
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
  // GET TRASH - Get all soft deleted students
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
        }).populate("major", "name");

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: result.length,
          data: result,
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

        // Get data with population
        const data = await Model.find(filter)
          .populate("major", "name")
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum);

        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
          success: true,
          data: data,
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
