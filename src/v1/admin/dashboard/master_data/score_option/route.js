const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "master-data/score-option";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new score option
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
          { key: "name", label: "ឈ្មោះស្ក័រ" },
          { key: "score_options", label: "ជម្រើសពិន្ទុ" },
        ];


        
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, score_options, total, max_score, pass_score, note, status } = req.body;

        // Check if score option already exists
        const existingScoreOption = await Model.findOne({
          name: name.trim(),
          deleted: false,
        });

        if (existingScoreOption) {
          return res.status(400).json({
            success: false,
            message: "ស្ក័រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        // Validate score_options
        if (!score_options || !Array.isArray(score_options) || score_options.length === 0) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ចូលជម្រើសពិន្ទុយ៉ាងតិចមួយ!",
          });
        }

        // Calculate total from score_options if not provided
        let calculatedTotal = total || 0;
        if (!total) {
          score_options.forEach((item) => {
            calculatedTotal += item.score || 0;
          });
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          score_options: score_options,
          total: calculatedTotal,
          max_score: max_score || 100,
          pass_score: pass_score || 50,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `ស្ក័រថ្មី: ${name} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "master_data_score_option",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `ស្ក័រថ្មី: ${name} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating score option:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ស្ក័រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតស្ក័រ! សូមព្យាយាមម្តងទៀត",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single score option
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
  // GET ALL - Get all score options
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
  // UPDATE - Update score option
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
        const { name, score_options, total, max_score, pass_score, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if score option exists
        const existingScoreOption = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingScoreOption) {
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
          const duplicateScoreOption = await Model.findOne({
            name: name.trim(),
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateScoreOption) {
            return res.status(400).json({
              success: false,
              message: "ស្ក័រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.name = name.trim();
        }

        if (score_options !== undefined && score_options !== null) {
          if (!Array.isArray(score_options) || score_options.length === 0) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ចូលជម្រើសពិន្ទុយ៉ាងតិចមួយ!",
            });
          }
          updateFields.score_options = score_options;
          
          // Calculate total from score_options if total not provided
          if (total === undefined || total === null) {
            let calculatedTotal = 0;
            score_options.forEach((item) => {
              calculatedTotal += item.score || 0;
            });
            updateFields.total = calculatedTotal;
          }
        }

        if (total !== undefined && total !== null) {
          updateFields.total = total;
        }

        if (max_score !== undefined && max_score !== null) {
          updateFields.max_score = max_score;
        }

        if (pass_score !== undefined && pass_score !== null) {
          updateFields.pass_score = pass_score;
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
          title: `ស្ក័រ: ${updatedData.name} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "master_data_score_option",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ស្ក័រត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating score option:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ស្ក័រនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែស្ក័រ!",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete score option (move to trash)
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

        // Check if score option exists
        const scoreOption = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!scoreOption) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedScoreOption = await Model.findByIdAndUpdate(
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
          title: `${scoreOption.name} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "master_data_score_option",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedScoreOption,
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
  // RESTORE - Restore soft deleted score option
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

        // Check if score option exists and is deleted
        const scoreOption = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!scoreOption) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredScoreOption = await Model.findByIdAndUpdate(
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
          title: `${scoreOption.name} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "master_data_score_option",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredScoreOption,
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
  // DELETE FOREVER - Permanently delete score option
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

        // Check if score option exists
        const scoreOption = await Model.findOne({
          _id: id,
        });

        if (!scoreOption) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store score option name for log before deletion
        const scoreOptionName = scoreOption.name;

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${scoreOptionName} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "master_data_score_option",
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
  // GET TRASH - Get all soft deleted score options
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