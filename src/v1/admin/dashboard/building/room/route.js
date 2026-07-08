const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "building-management/room";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelFloor = require('../floor/model');
const ModelBuilding = require("../building/model")

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;



  // ==========================================
  // CREATE - Create new room
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
          { key: "name", label: "ឈ្មោះបន្ទប់" },
          { key: "floor_id", label: "ជាន់" }
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, floor_id, note, status } = req.body;

        // Check if floor exists
        const floor = await ModelFloor.findOne({
          _id: floor_id,
          deleted: false,
        });

        if (!floor) {
          return res.status(404).json({
            success: false,
            message: "ជាន់នេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if room already exists in this floor
        const existingRoom = await Model.findOne({
          name: name.trim(),
          floor_id: floor_id,
          deleted: false,
        });

        if (existingRoom) {
          return res.status(400).json({
            success: false,
            message: "បន្ទប់នេះមានរួចហើយក្នុងជាន់នេះ!",
          });
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          floor_id: floor_id,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `បន្ទប់ថ្មី: ${name} នៅជាន់ ${floor.name} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `បន្ទប់ថ្មី: ${name} នៅជាន់ ${floor.name} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating room:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "បន្ទប់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតបន្ទប់! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

// ==========================================
// GET BY ID - Get single room
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
        }).populate("floor_id");

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // ✅ Fix: Use findOne or findById to get single building
        const dataBuilding = await ModelBuilding.findOne({
          _id: data.floor_id?.building_id
        });

        // ✅ Convert to object and add building data
        const roomData = data.toObject();
        roomData.building = dataBuilding || null;

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: roomData });
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

  // ==========================================
  // GET ALL - Get all rooms
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
        }).populate("floor_id")

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
  // UPDATE - Update room
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
        const { name, floor_id, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if room exists
        const existingRoom = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingRoom) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if floor exists (if floor_id is provided)
        if (floor_id) {
          const floor = await ModelFloor.findOne({
            _id: floor_id,
            deleted: false,
          });

          if (!floor) {
            return res.status(404).json({
              success: false,
              message: "ជាន់នេះមិនមានក្នុងប្រព័ន្ធ!",
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
          // Check duplicate room name in same floor
          const duplicateRoom = await Model.findOne({
            name: name.trim(),
            floor_id: floor_id || existingRoom.floor_id,
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateRoom) {
            return res.status(400).json({
              success: false,
              message: "បន្ទប់នេះមានរួចហើយក្នុងជាន់នេះ!",
            });
          }
          updateFields.name = name.trim();
        }

        if (floor_id !== undefined && floor_id !== null) {
          updateFields.floor_id = floor_id;
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

        // Get floor name for log
        const floorName = floor_id 
          ? (await ModelFloor.findById(floor_id))?.name 
          : (await ModelFloor.findById(existingRoom.floor_id))?.name;

        // Log
        await logActivity({
          title: `បន្ទប់: ${updatedData.name} នៅជាន់ ${floorName || ''} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "បន្ទប់ត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating room:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "បន្ទប់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែបន្ទប់!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete room (move to trash)
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

        // Check if room exists
        const room = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Get floor name for log
        const floor = await ModelFloor.findOne({
          _id: room.floor_id,
          deleted: false,
        });

        // Soft delete
        const updatedRoom = await Model.findByIdAndUpdate(
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
          title: `បន្ទប់: ${room.name} នៅជាន់ ${floor?.name || ''} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedRoom,
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
  // RESTORE - Restore soft deleted room
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

        // Check if room exists and is deleted
        const room = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Get floor name for log
        const floor = await ModelFloor.findOne({
          _id: room.floor_id,
          deleted: false,
        });

        // Restore
        const restoredRoom = await Model.findByIdAndUpdate(
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
          title: `បន្ទប់: ${room.name} នៅជាន់ ${floor?.name || ''} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredRoom,
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
  // DELETE FOREVER - Permanently delete room
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

        // Check if room exists
        const room = await Model.findOne({
          _id: id,
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store room name for log before deletion
        const roomName = room.name;
        const floor = await ModelFloor.findOne({
          _id: room.floor_id,
          deleted: false,
        });

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${roomName} នៅជាន់ ${floor?.name || ''} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
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
  // GET TRASH - Get all soft deleted rooms
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
        const result = await getFilteredMongoDB(req.query, Model, ["floor_id"], [], null);

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
  // GET - Pagination with building too
  // ==========================================
  prop.app.get(
    `${urlAPI}-with-building`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        const result = await getFilteredMongoDB(req.query, Model, ["floor_id"], [], null);
        const resultBuilding = await ModelBuilding.find({})

        const newData = result.data.map((row) => {
          var data = row.toObject();
          resultBuilding.map((rowBuilding) => {
              if(row.floor_id?.building_id == rowBuilding.id){
  data.building_data = rowBuilding
              }
          })
        
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
};

module.exports = route;