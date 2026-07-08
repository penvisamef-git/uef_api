const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "building-management/floor";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelBuilding = require('../building/model');
const ModelRoom = require("../room/model")

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;



  // ==========================================
  // CREATE - Create new floor
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
          { key: "name", label: "ឈ្មោះជាន់" },
          { key: "building_id", label: "អគារ" }
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, building_id, note, status } = req.body;

        // Check if building exists
        const building = await ModelBuilding.findOne({
          _id: building_id,
          deleted: false,
        });

        if (!building) {
          return res.status(404).json({
            success: false,
            message: "អគារនេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if floor already exists in this building
        const existingFloor = await Model.findOne({
          name: name.trim(),
          building_id: building_id,
          deleted: false,
        });

        if (existingFloor) {
          return res.status(400).json({
            success: false,
            message: "ជាន់នេះមានរួចហើយក្នុងអគារនេះ!",
          });
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          building_id: building_id,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `ជាន់ថ្មី: ${name} នៅក្នុងអគារ ${building.name} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `ជាន់ថ្មី: ${name} នៅក្នុងអគារ ${building.name} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating floor:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ជាន់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតជាន់! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single floor
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
          }).populate("building_id")

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
  // GET ALL - Get all floors
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
        }).populate("building_id")

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
  // UPDATE - Update floor
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
        const { name, building_id, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if floor exists
        const existingFloor = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingFloor) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if building exists (if building_id is provided)
        if (building_id) {
          const building = await ModelBuilding.findOne({
            _id: building_id,
            deleted: false,
          });

          if (!building) {
            return res.status(404).json({
              success: false,
              message: "អគារនេះមិនមានក្នុងប្រព័ន្ធ!",
            });
          }
        }

        // ==========================================
        // Build update object dynamically
        // ==========================================
        const updateFields = {
          updated_by: userId,
        };

        // Only add fields that are provided
        if (name !== undefined && name !== null) {
          // Check duplicate floor name in same building
          const duplicateFloor = await Model.findOne({
            name: name.trim(),
            building_id: building_id || existingFloor.building_id,
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateFloor) {
            return res.status(400).json({
              success: false,
              message: "ជាន់នេះមានរួចហើយក្នុងអគារនេះ!",
            });
          }
          updateFields.name = name.trim();
        }

        if (building_id !== undefined && building_id !== null) {
          updateFields.building_id = building_id;
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

        // Get building name for log
        const buildingName = building_id 
          ? (await ModelBuilding.findById(building_id))?.name 
          : (await ModelBuilding.findById(existingFloor.building_id))?.name;

        // Log
        await logActivity({
          title: `ជាន់: ${updatedData.name} នៅក្នុងអគារ ${buildingName || ''} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ជាន់ត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating floor:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "ជាន់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែជាន់!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete floor (move to trash)
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

        // Check if floor exists
        const floor = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!floor) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Get building name for log
        const building = await ModelBuilding.findOne({
          _id: floor.building_id,
          deleted: false,
        });

        // Soft delete
        const updatedFloor = await Model.findByIdAndUpdate(
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
          title: `ជាន់: ${floor.name} នៅក្នុងអគារ ${building?.name || ''} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedFloor,
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
  // RESTORE - Restore soft deleted floor
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

        // Check if floor exists and is deleted
        const floor = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!floor) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Get building name for log
        const building = await ModelBuilding.findOne({
          _id: floor.building_id,
          deleted: false,
        });

        // Restore
        const restoredFloor = await Model.findByIdAndUpdate(
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
          title: `ជាន់: ${floor.name} នៅក្នុងអគារ ${building?.name || ''} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredFloor,
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
  // DELETE FOREVER - Permanently delete floor
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

        // Check if floor exists
        const floor = await Model.findOne({
          _id: id,
        });

        if (!floor) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store floor name for log before deletion
        const floorName = floor.name;
        const building = await ModelBuilding.findOne({
          _id: floor.building_id,
          deleted: false,
        });

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${floorName} នៅក្នុងអគារ ${building?.name || ''} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "building_management",
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
  // GET TRASH - Get all soft deleted floors
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
        const result = await getFilteredMongoDB(req.query, Model, ["building_id"], [], null);

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
// GET BY ID - Get single floor with all rooms
// ==========================================
prop.app.get(
  `${urlAPI}/room-all/:id`,
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

        // Get floor with building populated
        var data = await Model.findOne({
          _id: id,
          deleted: false,
        }).populate("building_id");

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Get all rooms for this floor
        const dataRoom = await ModelRoom.find({ 
          floor_id: data._id,  // Use floor ID (data._id)
          deleted: false 
        }).sort({ name: 1 });

        // Convert to object and add rooms
        const floorData = data.toObject();
        floorData.rooms = dataRoom;
        floorData.room_count = dataRoom.length;

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: floorData }); // ✅ Return floorData
      }
    } catch (err) {
      console.error("❌ Error:", err);
      res.status(500).json({
        success: false,
        message: "Internal Error",
        error: err.message || err,
      });
    }
  },
);



};

module.exports = route;