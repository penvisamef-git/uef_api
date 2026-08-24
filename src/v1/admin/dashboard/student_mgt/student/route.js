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
          { key: "firstname_english", label: "គោត្តនាម (ឡាតាំង)" },
          { key: "lastname_english", label: "នាម (ឡាតាំង)" },
          { key: "dob", label: "ថ្ងៃខែឆ្នាំកំណើត" },
          { key: "national_id", label: "ជនជាតិ" },
          { key: "nationality_id", label: "សញ្ជាតិ" },
          { key: "gender", label: "ភេទ" },
          { key: "personal_contact", label: "លេខទូរស័ព្ទផ្ទាល់ខ្លួន" },
          { key: "degree_level_id", label: "កម្រិតសិក្សា" },
          { key: "shift_id", label: "វេណសិក្សា" },
          { key: "major_id", label: "មុខជំនាញ" },
          { key: "high_school_name", label: "ឈ្មោះវិទ្យាល័យ" },
          { key: "come_from_province_or_city", label: "មកពីរខេត្ត" },
          { key: "level_lastest_certificat", label: "កម្រិតសញ្ញាបត្រចុងក្រោយ" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const {
          firstname,
          lastname,
          firstname_english,
          lastname_english,
          uef_code_id_card_number,
          dob,
          national_id,
          nationality_id,
          gender,
          marital_status,
          id_card_number,
          passport_number,
          born_house_number,
          born_street_number,
          born_village_id,
          born_zip_code,
          address_house_number,
          address_street_number,
          address_village_id,
          address_zip_code,
          email,
          personal_contact,
          family_contact,
          experience,
          degree_level_id,
          shift_id,
          major_id,
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
          // Father
          family_father_name,
          family_father_name_en,
          family_father_age,
          family_father_job,
          family_father_company,
          family_father_contact,
          family_father_address_house_number,
          family_father_address_street_number,
          family_father_address_village_id,
          family_father_address_zip_code,
          family_father_national_id,
          family_father_nationality_id,
          // Mother
          family_mother_name,
          family_mother_name_en,
          family_mother_age,
          family_mother_job,
          family_mother_company,
          family_mother_contact,
          family_mother_address_house_number,
          family_mother_address_street_number,
          family_mother_address_village_id,
          family_mother_address_zip_code,
          family_mother_national_id,
          family_mother_nationality_id,
          note,
          status,
        } = req.body;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិមិនត្រឹមត្រូវ!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិមិនត្រឹមត្រូវ!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(degree_level_id)) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសិក្សាមិនត្រឹមត្រូវ!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(shift_id)) {
          return res.status(400).json({
            success: false,
            message: "វេណសិក្សាមិនត្រឹមត្រូវ!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(major_id)) {
          return res.status(400).json({
            success: false,
            message: "មុខជំនាញមិនត្រឹមត្រូវ!",
          });
        }

        // Validate Father ObjectIds if provided
        if (family_father_national_id && !mongoose.Types.ObjectId.isValid(family_father_national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិឪពុកមិនត្រឹមត្រូវ!",
          });
        }

        if (family_father_nationality_id && !mongoose.Types.ObjectId.isValid(family_father_nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិឪពុកមិនត្រឹមត្រូវ!",
          });
        }

        // Validate Mother ObjectIds if provided
        if (family_mother_national_id && !mongoose.Types.ObjectId.isValid(family_mother_national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិម្តាយមិនត្រឹមត្រូវ!",
          });
        }

        if (family_mother_nationality_id && !mongoose.Types.ObjectId.isValid(family_mother_nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិម្តាយមិនត្រឹមត្រូវ!",
          });
        }

        // Save
        const saveData = await Model.create({
          // Personal Information
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          firstname_english: firstname_english.trim(),
          lastname_english: lastname_english.trim(),
          uef_code_id_card_number: uef_code_id_card_number || "",
          dob: dob,
          national_id: national_id,
          nationality_id: nationality_id,
          gender: gender,
          marital_status: marital_status || "single",
          id_card_number: id_card_number || "",
          passport_number: passport_number || "",
          
          // Born Address
          born_house_number: born_house_number || "",
          born_street_number: born_street_number || "",
          born_village_id: born_village_id || "",
          born_zip_code: born_zip_code || "",
          
          // Present Address
          address_house_number: address_house_number || "",
          address_street_number: address_street_number || "",
          address_village_id: address_village_id || "",
          address_zip_code: address_zip_code || "",
          
          email: email || "",
          personal_contact: personal_contact.trim(),
          family_contact: family_contact || "",
          experience: experience || [],
          
          // University Information
          degree_level_id: degree_level_id,
          shift_id: shift_id,
          major_id: major_id,
          know_uef: know_uef || "facebook",
          know_uef_other: know_uef_other || "",
          
          // Education
          high_school_name: high_school_name.trim(),
          come_from_province_or_city: come_from_province_or_city.trim(),
          level_lastest_certificat: level_lastest_certificat.trim(),
          lastest_skill: lastest_skill || "",
          date_pass_exam: date_pass_exam || "",
          certificat_number: certificat_number || "",
          score_total: score_total || "",
          score_level: score_level || "",
          english_level: english_level || "basic",
          
          // Work Experience
          working_position: working_position || "",
          working_company: working_company || "",
          working_place: working_place || "",
          
          // Father
          family_father_name: family_father_name || "",
          family_father_name_en: family_father_name_en || "",
          family_father_age: family_father_age || "",
          family_father_job: family_father_job || "",
          family_father_company: family_father_company || "",
          family_father_contact: family_father_contact || "",
          family_father_address_house_number: family_father_address_house_number || "",
          family_father_address_street_number: family_father_address_street_number || "",
          family_father_address_village_id: family_father_address_village_id || "",
          family_father_address_zip_code: family_father_address_zip_code || "",
          family_father_national_id: family_father_national_id || null,
          family_father_nationality_id: family_father_nationality_id || null,
          
          // Mother
          family_mother_name: family_mother_name || "",
          family_mother_name_en: family_mother_name_en || "",
          family_mother_age: family_mother_age || "",
          family_mother_job: family_mother_job || "",
          family_mother_company: family_mother_company || "",
          family_mother_contact: family_mother_contact || "",
          family_mother_address_house_number: family_mother_address_house_number || "",
          family_mother_address_street_number: family_mother_address_street_number || "",
          family_mother_address_village_id: family_mother_address_village_id || "",
          family_mother_address_zip_code: family_mother_address_zip_code || "",
          family_mother_national_id: family_mother_national_id || null,
          family_mother_nationality_id: family_mother_nationality_id || null,
          
          // Other
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
          })
            .populate("national_id", "name name_kh name_en")
            .populate("nationality_id", "name name_kh name_en")
            .populate("degree_level_id", "name name_kh name_en")
            .populate("shift_id", "name name_kh name_en")
            .populate("major_id", "name name_kh name_en")
            .populate("family_father_national_id", "name name_kh name_en")
            .populate("family_father_nationality_id", "name name_kh name_en")
            .populate("family_mother_national_id", "name name_kh name_en")
            .populate("family_mother_nationality_id", "name name_kh name_en");

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
        })
          .populate("national_id", "name name_kh name_en")
          .populate("nationality_id", "name name_kh name_en")
          .populate("degree_level_id", "name name_kh name_en")
          .populate("shift_id", "name name_kh name_en")
          .populate("major_id", "name name_kh name_en")
          .populate("family_father_national_id", "name name_kh name_en")
          .populate("family_father_nationality_id", "name name_kh name_en")
          .populate("family_mother_national_id", "name name_kh name_en")
          .populate("family_mother_nationality_id", "name name_kh name_en");

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
        const updateData = req.body;

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

        // Validate ObjectIds if they are being updated
        if (updateData.national_id && !mongoose.Types.ObjectId.isValid(updateData.national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.nationality_id && !mongoose.Types.ObjectId.isValid(updateData.nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.degree_level_id && !mongoose.Types.ObjectId.isValid(updateData.degree_level_id)) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសិក្សាមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.shift_id && !mongoose.Types.ObjectId.isValid(updateData.shift_id)) {
          return res.status(400).json({
            success: false,
            message: "វេណសិក្សាមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.major_id && !mongoose.Types.ObjectId.isValid(updateData.major_id)) {
          return res.status(400).json({
            success: false,
            message: "មុខជំនាញមិនត្រឹមត្រូវ!",
          });
        }

        // Validate Father ObjectIds if provided
        if (updateData.family_father_national_id && !mongoose.Types.ObjectId.isValid(updateData.family_father_national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិឪពុកមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.family_father_nationality_id && !mongoose.Types.ObjectId.isValid(updateData.family_father_nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិឪពុកមិនត្រឹមត្រូវ!",
          });
        }

        // Validate Mother ObjectIds if provided
        if (updateData.family_mother_national_id && !mongoose.Types.ObjectId.isValid(updateData.family_mother_national_id)) {
          return res.status(400).json({
            success: false,
            message: "ជនជាតិម្តាយមិនត្រឹមត្រូវ!",
          });
        }

        if (updateData.family_mother_nationality_id && !mongoose.Types.ObjectId.isValid(updateData.family_mother_nationality_id)) {
          return res.status(400).json({
            success: false,
            message: "សញ្ជាតិម្តាយមិនត្រឹមត្រូវ!",
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
        })
          .populate("national_id", "name name_kh name_en")
          .populate("nationality_id", "name name_kh name_en")
          .populate("degree_level_id", "name name_kh name_en")
          .populate("shift_id", "name name_kh name_en")
          .populate("major_id", "name name_kh name_en")
          .populate("family_father_national_id", "name name_kh name_en")
          .populate("family_father_nationality_id", "name name_kh name_en")
          .populate("family_mother_national_id", "name name_kh name_en")
          .populate("family_mother_nationality_id", "name name_kh name_en");

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
        })
          .populate("national_id", "name name_kh name_en")
          .populate("nationality_id", "name name_kh name_en")
          .populate("degree_level_id", "name name_kh name_en")
          .populate("shift_id", "name name_kh name_en")
          .populate("major_id", "name name_kh name_en")
          .populate("family_father_national_id", "name name_kh name_en")
          .populate("family_father_nationality_id", "name name_kh name_en")
          .populate("family_mother_national_id", "name name_kh name_en")
          .populate("family_mother_nationality_id", "name name_kh name_en");

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
          .populate("national_id", "name name_kh name_en")
          .populate("nationality_id", "name name_kh name_en")
          .populate("degree_level_id", "name name_kh name_en")
          .populate("shift_id", "name name_kh name_en")
          .populate("major_id", "name name_kh name_en")
          .populate("family_father_national_id", "name name_kh name_en")
          .populate("family_father_nationality_id", "name name_kh name_en")
          .populate("family_mother_national_id", "name name_kh name_en")
          .populate("family_mother_nationality_id", "name name_kh name_en")
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