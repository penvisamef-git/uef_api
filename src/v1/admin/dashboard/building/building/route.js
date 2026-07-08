const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "building-management/building";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelFloor = require("../floor/model")
const ModelRoom = require("../room/model")

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new building
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // Validation
        const requiredFields = [{ key: "name", label: "ឈ្មោះអគារ" }];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const { name, note, status } = req.body;

        // Check if building already exists
        const existingBuilding = await Model.findOne({
          name: name.trim(),
          deleted: false,
        });

        if (existingBuilding) {
          return res.status(400).json({
            success: false,
            message: "អគារនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        // Save
        const saveData = await Model.create({
          name: name.trim(),
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Log
        await logActivity({
          title: `អគារថ្មី: ${name} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: saveData,
          message: `អគារថ្មី: ${name} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating building:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "អគារនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតអគារ! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single building
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
  // GET ALL - Get all buildings
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
  // UPDATE - Update building
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
        const { name, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if building exists
        const existingBuilding = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingBuilding) {
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
          // Check duplicate name (excluding current building)
          const duplicateBuilding = await Model.findOne({
            name: name.trim(),
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateBuilding) {
            return res.status(400).json({
              success: false,
              message: "អគារនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.name = name.trim();
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
          title: `អគារ: ${updatedData.name} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "អគារត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating building:", error);

        // Handle duplicate key error
        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "អគារនេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែអគារ!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete building (move to trash)
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

        // Check if building exists
        const building = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!building) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedBuilding = await Model.findByIdAndUpdate(
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
          title: `${building.name} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedBuilding,
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
  // RESTORE - Restore soft deleted building
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

        // Check if building exists and is deleted
        const building = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!building) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredBuilding = await Model.findByIdAndUpdate(
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
          title: `${building.name} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "building_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredBuilding,
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
  // DELETE FOREVER - Permanently delete building
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

        // Check if building exists
        const building = await Model.findOne({
          _id: id,
        });

        if (!building) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Store building name for log before deletion
        const buildingName = building.name;

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `${buildingName} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
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
  // GET TRASH - Get all soft deleted buildings
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
        res.status(500).json({ success: false, message: err.message });
      }
    },
  );





  
 // ==========================================
// GET BY ID - Get single building and All Floor
// ==========================================
prop.app.get(
  `${urlAPI}/all-floor/:id`,
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

        // Get all floors for this building
        // Use data._id (building ID) to find floors
        const dataFloor = await ModelFloor.find({ 
          building_id: data._id,  // ✅ Use data._id, not data.building_id
          deleted: false 
        }).sort({ name: 1 });

        // Convert to object and add floors
        const buildingData = data.toObject();
        buildingData.floors = dataFloor;
        buildingData.floor_count = dataFloor.length;

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: buildingData });
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
// GET ALL - Get all buildings with all floor and room
// ==========================================
prop.app.get(
  `${urlAPI}/all/floor-and-room`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      // Get all buildings
      const buildings = await Model.find({
        deleted: false,
      }).lean();

      // Get all floors
      const floors = await ModelFloor.find({
        deleted: false,
      }).lean();

      // Get all rooms
      const rooms = await ModelRoom.find({
        deleted: false,
      }).lean();

      // Build the nested structure
      const result = buildings.map((building) => {
        // Find floors for this building
        const buildingFloors = floors.filter(
          (floor) => floor.building_id.toString() === building._id.toString()
        );

        // For each floor, find its rooms
        const floorsWithRooms = buildingFloors.map((floor) => {
          const floorRooms = rooms.filter(
            (room) => room.floor_id.toString() === floor._id.toString()
          );
          return {
            ...floor,
            rooms: floorRooms,
            room_count: floorRooms.length,
          };
        });

        return {
          ...building,
          floors: floorsWithRooms,
          floor_count: floorsWithRooms.length,
        };
      });

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

};

module.exports = route;