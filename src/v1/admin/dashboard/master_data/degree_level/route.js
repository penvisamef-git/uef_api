const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "master-data/degree-level";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new degree level
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Validation
        const requiredFields = [
          { key: "name", label: "ឈ្មោះកម្រិតសញ្ញាបត្រ" },
          { key: "name_in_eng", label: "ឈ្មោះជាភាសាអង់គ្លេស" }
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, name_in_eng, code, note, status } = req.body;

        // Check if degree level already exists (by Khmer name)
        const existingDegreeLevel = await Model.findOne({
          name: name.trim(),
          deleted: false,
        });

        if (existingDegreeLevel) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if degree level already exists (by English name)
        const existingDegreeLevelEng = await Model.findOne({
          name_in_eng: name_in_eng.trim(),
          deleted: false,
        });

        if (existingDegreeLevelEng) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if code already exists (if provided)
        if (code && code.trim()) {
          const existingCode = await Model.findOne({
            code: code.trim(),
            deleted: false,
          });

          if (existingCode) {
            return res.status(400).json({
              success: false,
              message: "លេខកូដនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          name_in_eng: name_in_eng.trim(),
          code: code ? code.trim() : "",
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `កម្រិតសញ្ញាបត្រថ្មី: ${name} (${name_in_eng}) ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "master_data_degree_level",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `កម្រិតសញ្ញាបត្រថ្មី: ${name} (${name_in_eng}) ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating degree level:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតកម្រិតសញ្ញាបត្រ! សូមព្យាយាមម្តងទៀត",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single degree level
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
  // GET ALL - Get all degree levels
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
        }).sort({ name: 1 });

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
  // UPDATE - Update degree level
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
        const { name, name_in_eng, code, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if degree level exists
        const existingDegreeLevel = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingDegreeLevel) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Build update object dynamically
        const updateFields = {
          updated_by: userId,
        };

        // Only add fields that are provided
        if (name !== undefined && name !== null) {
          // Check duplicate name (excluding current record)
          const duplicateDegreeLevel = await Model.findOne({
            name: name.trim(),
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateDegreeLevel) {
            return res.status(400).json({
              success: false,
              message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.name = name.trim();
        }

        if (name_in_eng !== undefined && name_in_eng !== null) {
          // Check duplicate English name (excluding current record)
          const duplicateDegreeLevelEng = await Model.findOne({
            name_in_eng: name_in_eng.trim(),
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateDegreeLevelEng) {
            return res.status(400).json({
              success: false,
              message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.name_in_eng = name_in_eng.trim();
        }

        if (code !== undefined && code !== null) {
          // Check duplicate code (excluding current record)
          if (code.trim()) {
            const duplicateCode = await Model.findOne({
              code: code.trim(),
              deleted: false,
              _id: { $ne: id },
            });

            if (duplicateCode) {
              return res.status(400).json({
                success: false,
                message: "លេខកូដនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
              });
            }
          }
          updateFields.code = code ? code.trim() : "";
        }

        if (note !== undefined && note !== null) {
          updateFields.note = note;
        }

        if (status !== undefined && status !== null) {
          updateFields.status = status;
        }

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
          title: `កម្រិតសញ្ញាបត្រ: ${updatedData.name} (${updatedData.name_in_eng}) ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "master_data_degree_level",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "កម្រិតសញ្ញាបត្រត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating degree level:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កម្រិតសញ្ញាបត្រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែកម្រិតសញ្ញាបត្រ!",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete degree level (move to trash)
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

        // Check if degree level exists
        const degreeLevel = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!degreeLevel) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedDegreeLevel = await Model.findByIdAndUpdate(
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
          title: `${degreeLevel.name} (${degreeLevel.name_in_eng}) ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "master_data_degree_level",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedDegreeLevel,
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
  // RESTORE - Restore soft deleted degree level
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

        // Check if degree level exists and is deleted
        const degreeLevel = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!degreeLevel) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredDegreeLevel = await Model.findByIdAndUpdate(
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
          title: `${degreeLevel.name} (${degreeLevel.name_in_eng}) ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "master_data_degree_level",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredDegreeLevel,
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
  // DELETE FOREVER - Permanently delete degree level
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

        // Check if degree level exists
        const degreeLevel = await Model.findOne({
          _id: id,
        });

        if (!degreeLevel) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store degree level name for log before deletion
        const degreeLevelName = degreeLevel.name;
        const degreeLevelNameEng = degreeLevel.name_in_eng;

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${degreeLevelName} (${degreeLevelNameEng}) ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "master_data_degree_level",
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
  // GET TRASH - Get all soft deleted degree levels
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
        }).sort({ name: 1 });

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
  // GET - Pagination with search
  // ==========================================
  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        const result = await getFilteredMongoDB(req.query, Model, [], [], null);

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
        console.error("❌ Error in pagination:", err);
        res.status(500).json({ success: false, message: err.message });
      }
    },
  );
};

module.exports = route;