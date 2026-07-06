const mongoose = require("mongoose");
const UserModel = require("../../user/user.model");
const GroupUserModel = require("./group_user.model");
const getFilteredMongoDB = require("../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "group-user-permission";
const { logActivity } = require("../../../../util/log");
const route = (prop) => {
  // **************** Declaration ****************
  const urlAPI = `/${prop.main_route}/${baseRoute}`;
  // Log
  const logTitle = "user_group_permission";
  // Error Content
  const document = "សិទ្ធអ្នកប្រើប្រាស់";

  function updatedText(name) {
    return `${document} ${name} ត្រូវបានកែប្រែ និងរក្សារទុក!`;
  }
  function deletedText(name) {
    return `${document}  ${name} ត្រូវបានលុបចេញពីប្រព័ន្ធ!`;
  }
  const serverError = "ម៉ាសុីនមេមានបញ្ហា សូមព្យាយាមម្តងទៀតពេលក្រោយ!";
  const existsText = `សិទ្ធអ្នកប្រើប្រាស់ មាននៅក្នុងប្រព័ន្ធរួចហើយ!`;
  const noDataFound = `មិនមាន${document}នៅក្នុងប្រព័ន្ធ!`;
  const newSave = `${document} ថ្មីត្រូវបានរក្សារទុក!`;
  const noIDFound = "មិនមាន ID ត្រឹមត្រូវ!";
  const notFoundData = "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!";
  const noDataUpdate = "មិនមានទិន្នន័យដើម្បីកែប្រែ!";

  // ******************** Helper ****************************
  function checkValidtion(res, req, requiredFields) {
    for (const field of requiredFields) {
      const value = req.body[field.key];

      if (
        value === undefined || // missing key
        value === null || // null value
        value === "" // empty string
      ) {
        return res.json({
          success: false,
          message: `សូមបញ្ចូល ${field.label}`,
        });
      }
    }
  }

  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // ───────────────────────────────────────────────
        // ✅ Validate required fields

        const requiredFields = [
          { key: "name", label: "ឈ្មោះ" },
          {
            key: "permission",
            label: "សិទ្ធអ្នកប្រើប្រាស់",
          },
        ];
        checkValidtion(res, req, requiredFields);

        // ───────────────────────────────────────────────
        // ✅ Get creator ID from session
        const { user_id: userId } = req.session;
        const { name, permission, note, status } = req.body;
        const titleResponse = name;

        // ───────────────────────────────────────────────

        // ✅ Create new unit
        const exists = await GroupUserModel.exists({ name });
        if (exists) {
          return res.json({
            success: false,
            message: existsText,
          });
        }

        const saveData = await GroupUserModel.create({
          name,
          permission,
          note,
          status,
          deleted: false, //  Hidden
          created_by: userId, //  Hidden
          updated_by: userId, //  Hidden
        });

        // ───────────────────────────────────────────────
        // ✅ Log activity
        const userData = await UserModel.findOne({ _id: userId });
        const userEmail = userData.email;

        await logActivity({
          title: `${document}ថ្មី ${titleResponse} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${userEmail}`,
          categoryTitle: logTitle,
          createdBy: userId,
          req,
        });

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(201).json({
          success: true,
          data: saveData,
          message: newSave,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: serverError,
          error: err,
        });
      }
    }
  );

  prop.app.get(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;

        if (id) {
          // ✅ Validate ID
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: "No ID Found",
            });
          }

          const unit = await GroupUserModel.findOne({
            _id: id,
            deleted: false,
          });

          if (!unit) {
            return res.status(404).json({
              success: false,
              message: notFoundData,
            });
          }

          return res.status(200).json({ success: true, data: unit });
        }
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Internal Error",
          error: err,
        });
      }
    }
  );

  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await getFilteredMongoDB(
          req.query,
          GroupUserModel,
          [],
          []
        );

        res.json({ success: true, ...result });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  );

  prop.app.get(
    `${urlAPI}-all`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const data = await GroupUserModel.find(); // Fetch all categories

        res.status(200).json({
          success: true,
          data: data,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    }
  );

  prop.app.delete(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // ───────────────────────────────────────────────
        // ✅  ID
        const { id } = req.params;
        const { user_id: userId } = req.session;

        // ───────────────────────────────────────────────
        // ✅ Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: noIDFound,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Dynamically build update fields
        const updateFields = {
          deleted: true,
          updated_by: userId,
        };

        // ───────────────────────────────────────────────
        // ✅ Remove empty fields (null or undefined)
        Object.keys(updateFields).forEach(
          (key) => updateFields[key] == null && delete updateFields[key]
        );

        // ───────────────────────────────────────────────
        // ✅ Ensure there's at least one field to update
        if (Object.keys(updateFields).length === 1) {
          // Only `updated_by` exists
          return res.status(400).json({
            success: false,
            message: noDataUpdate,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Update unit
        const updatedUnit = await GroupUserModel.findByIdAndUpdate(
          id,
          updateFields,
          {
            new: true,
          }
        );

        if (!updatedUnit) {
          return res.status(404).json({
            success: false,
            message: noDataFound,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Log activity
        const userData = await UserModel.findOne({ _id: userId });
        const userEmail = userData.email;
        delete updateFields.updated_by;
        await logActivity({
          title: `${document} ${updatedUnit.name} ត្រូវបានលុប!`,
          description: `គណនី: ${userEmail} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: logTitle,
          createdBy: userId,
          req,
        });

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(200).json({
          success: true,
          data: `${document} ${updatedUnit.name} បានលុប`,
          message: deletedText(`${updatedUnit.name}`),
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: serverError,
          error: err,
        });
      }
    }
  );

  prop.app.put(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // ───────────────────────────────────────────────
        // ✅  ID
        const { id } = req.params;
        const { user_id: userId } = req.session;

        // ───────────────────────────────────────────────
        // ✅ Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: noIDFound,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Dynamically build update fields
        const updateFields = {
          ...req.body,
          updated_by: userId,
        };

        // ───────────────────────────────────────────────
        // ✅ Remove empty fields (null or undefined)
        Object.keys(updateFields).forEach(
          (key) => updateFields[key] == null && delete updateFields[key]
        );

        // ───────────────────────────────────────────────
        // ✅ Ensure there's at least one field to update
        if (Object.keys(updateFields).length === 1) {
          // Only `updated_by` exists
          return res.status(400).json({
            success: false,
            message: noDataUpdate,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Update unit
        const updatedUnit = await GroupUserModel.findByIdAndUpdate(
          id,
          updateFields,
          {
            new: true,
          }
        );

        if (!updatedUnit) {
          return res.status(404).json({
            success: false,
            message: noDataFound,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Log activity
        const userData = await UserModel.findOne({ _id: userId });
        const userEmail = userData.email;
        delete updateFields.updated_by;
        await logActivity({
          title: `${document} ${updatedUnit.name} ត្រូវបានកែប្រែ!`,
          description: `គណនី: ${userEmail} បានកែប្រែព័ត៌មានដូចជា : ${JSON.stringify(
            updateFields
          )}`,
          categoryTitle: logTitle,
          createdBy: userId,
          req,
        });

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(200).json({
          success: true,
          data: updatedUnit,
          message: updatedText(updatedUnit.name),
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: serverError,
          error: err,
        });
      }
    }
  );
};

module.exports = route;
