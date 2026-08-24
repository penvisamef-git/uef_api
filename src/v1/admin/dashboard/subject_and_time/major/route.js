const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "subject-and-major/major";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelSubject = require("../subject/model")
const ModelDepartment = require("../department/model")

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new major
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Validation - Name and department_id are required
        const requiredFields = [
          { key: "name", label: "ឈ្មោះជំនាញ" },
          { key: "department_id", label: "នាយកដ្ឋាន" }
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, name_in_english, department_id, note, status } = req.body;

        // Check if major already exists
        const existingMajor = await Model.findOne({
          name: name.trim(),
          deleted: false,
        });

        if (existingMajor) {
          return res.status(400).json({
            success: false,
            message: "ជំនាញនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if major with English name already exists (only if provided)
        if (name_in_english && name_in_english.trim()) {
          const existingMajorEng = await Model.findOne({
            name_in_english: name_in_english.trim(),
            deleted: false,
          });

          if (existingMajorEng) {
            return res.status(400).json({
              success: false,
              message: "ជំនាញដែលមានឈ្មោះអង់គ្លេសនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
        }

        // Validate department_id is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(department_id)) {
          return res.status(400).json({
            success: false,
            message: "សូមជ្រើសរើសនាយកដ្ឋានឱ្យបានត្រឹមត្រូវ!",
          });
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          name_in_english: name_in_english ? name_in_english.trim() : "",
          department_id: department_id,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `ជំនាញថ្មី: ${name} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "subject_and_time",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `ជំនាញថ្មី: ${name} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating major:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ជំនាញនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតជំនាញ! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single major
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
          }).populate('department_id', 'name name_in_engish');

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
  // GET ALL - Get all majors
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
        }).populate('department_id', 'name name_in_engish');

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
  // UPDATE - Update major
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
        const { name, name_in_english, department_id, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if major exists
        const existingMajor = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingMajor) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // ==========================================
        // Build update object dynamically
        // ==========================================
        const updateFields = {
          updated_by: userId,
        };

        // Only add fields that are provided
        if (name !== undefined && name !== null) {
          // Check duplicate name (excluding current major)
          const duplicateMajor = await Model.findOne({
            name: name.trim(),
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateMajor) {
            return res.status(400).json({
              success: false,
              message: "ជំនាញនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.name = name.trim();
        }

        if (name_in_english !== undefined && name_in_english !== null) {
          // Check duplicate English name (excluding current major)
          if (name_in_english.trim()) {
            const duplicateMajorEng = await Model.findOne({
              name_in_english: name_in_english.trim(),
              deleted: false,
              _id: { $ne: id },
            });

            if (duplicateMajorEng) {
              return res.status(400).json({
                success: false,
                message: "ជំនាញដែលមានឈ្មោះអង់គ្លេសនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              });
            }
            updateFields.name_in_english = name_in_english.trim();
          } else {
            updateFields.name_in_english = "";
          }
        }

        if (department_id !== undefined && department_id !== null) {
          // Validate department_id is a valid ObjectId
          if (!mongoose.Types.ObjectId.isValid(department_id)) {
            return res.status(400).json({
              success: false,
              message: "សូមជ្រើសរើសនាយកដ្ឋានឱ្យបានត្រឹមត្រូវ!",
            });
          }
          updateFields.department_id = department_id;
        }

        if (note !== undefined && note !== null) {
          updateFields.note = note;
        }

        if (status !== undefined && status !== null) {
          updateFields.status = status;
        }

        // ==========================================
        // Check if there's anything to update
        // ==========================================
        if (Object.keys(updateFields).length === 1) {
          // Only updated_by exists, nothing to update
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
          title: `ជំនាញ: ${updatedData.name} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "subject_and_time",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ជំនាញត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating major:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ជំនាញនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែជំនាញ!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete major (move to trash)
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

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if major exists
        const major = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!major) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedMajor = await Model.findByIdAndUpdate(
          id,
          {
            deleted: true,
            deleted_at: new Date(),
            deleted_by: userId,
            updated_by: userId,
          },
          { new: true },
        );

        // Log
        await logActivity({
          title: `${major.name} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "subject_and_time",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedMajor,
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
  // RESTORE - Restore soft deleted major
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

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if major exists and is deleted
        const major = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!major) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredMajor = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        );

        // Log
        await logActivity({
          title: `${major.name} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "subject_and_time",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredMajor,
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
  // DELETE FOREVER - Permanently delete major
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

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if major exists
        const major = await Model.findOne({
          _id: id,
        });

        if (!major) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store major name for log before deletion
        const majorName = major.name;

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${majorName} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "subject_and_time",
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
  // GET TRASH - Get all soft deleted majors
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
        }).populate('department_id', 'name name_in_engish');

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
        const result = await getFilteredMongoDB(req.query, Model, ['department_id'], [], null);

        const newData = result.data.map((row) => {
          const data = row.toObject();
          return data;
        });

        res.status(200).json({
          success: true,
          data: newData,
          pagination: result.pagination,
        });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    },
  );

  // ==========================================
  // GET ALL - Get all majors with their subjects (Using Aggregation)
  // ==========================================
  prop.app.get(
    `${urlAPI}-get-all-subject`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.aggregate([
          // Step 1: Get only non-deleted majors
          {
            $match: {
              deleted: false,
            },
          },
          // Step 2: Lookup department
          {
            $lookup: {
              from: "departments", // Collection name in MongoDB
              localField: "department_id",
              foreignField: "_id",
              as: "department",
            },
          },
          // Step 3: Unwind department (convert array to object)
          {
            $unwind: {
              path: "$department",
              preserveNullAndEmptyArrays: true,
            },
          },
          // Step 4: Lookup subjects
          {
            $lookup: {
              from: "subjects", // Collection name in MongoDB
              let: { majorId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$major_id", "$$majorId"] },
                        { $eq: ["$deleted", false] },
                      ],
                    },
                  },
                },
                // Step 5: Remove unwanted fields from subjects
                {
                  $project: {
                    __v: 0,
                  },
                },
              ],
              as: "subjects",
            },
          },
          // Step 6: Add subject count
          {
            $addFields: {
              subject_count: { $size: "$subjects" },
            },
          },
          // Step 7: Remove unwanted fields
          {
            $project: {
              __v: 0,
              "department.__v": 0,
            },
          },
          // Step 8: Sort by name
          {
            $sort: {
              name: 1,
            },
          },
        ]);

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: result.length,
          data: result,
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );







  prop.app.get(
  `${urlAPI}-get-all-subject-with-department`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const result = await Model.aggregate([
        // Step 1: Get only non-deleted majors
        {
          $match: {
            deleted: false,
          },
        },
        // Step 2: Lookup department
        {
          $lookup: {
            from: "departments",
            localField: "department_id",
            foreignField: "_id",
            as: "department",
          },
        },
        // Step 3: Unwind department (convert array to object)
        {
          $unwind: {
            path: "$department",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Step 4: Lookup subjects for each major
        {
          $lookup: {
            from: "subjects",
            let: { majorId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$major_id", "$$majorId"] },
                      { $eq: ["$deleted", false] },
                    ],
                  },
                },
              },
              {
                $project: {
                  __v: 0,
                },
              },
            ],
            as: "subjects",
          },
        },
        // Step 5: Add subject count
        {
          $addFields: {
            subject_count: { $size: "$subjects" },
          },
        },
        // Step 6: Remove unwanted fields
        {
          $project: {
            __v: 0,
            "department.__v": 0,
          },
        },
        // Step 7: Sort by department name then major name
        {
          $sort: {
            "department.name": 1,
            name: 1,
          },
        },
        // Step 8: Group by department
        {
          $group: {
            _id: "$department._id",
            department_name: { $first: "$department.name" },
            department_name_in_engish: { $first: "$department.name_in_engish" },
            majors: {
              $push: {
                _id: "$_id",
                name: "$name",
                name_in_english: "$name_in_english",
                note: "$note",
                status: "$status",
                subjects: "$subjects",
                subject_count: "$subject_count",
                created_date: "$created_date",
                updated_date: "$updated_date",
              },
            },
            total_majors: { $sum: 1 },
          },
        },
        // Step 9: Sort departments by name
        {
          $sort: {
            department_name: 1,
          },
        },
        // Step 10: Project final structure
        {
          $project: {
            _id: 0,
            department_id: "$_id",
            department_name: 1,
            department_name_in_engish: 1,
            total_majors: 1,
            majors: 1,
          },
        },
      ]);

      res.status(200).json({
        success: true,
        message: "ជោគជ័យ",
        total_departments: result.length,
        data: result,
      });
    } catch (err) {
      console.error("❌ Error:", err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message || err,
      });
    }
  },
);

};

module.exports = route;