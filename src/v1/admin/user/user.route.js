const mongoose = require("mongoose");
const UserModel = require("../user/user.model");
const getFilteredMongoDB = require("../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "users";
const { logActivity } = require("../../../util/log");
const bcrypt = require("bcrypt");
const modelGroupUser = require("../user/group/group_user.model");
const SessionModel = require("../session/session.model");
const route = (prop) => {
  // **************** Declaration ****************
  const urlAPI = `/${prop.main_route}/${baseRoute}`;
  // Log
  const logTitle = "user";
  // Error Content
  const document = "អ្នកប្រើប្រាស់";

  function updatedText(name) {
    return `${document} ${name} ត្រូវបានកែប្រែ និងរក្សារទុក!`;
  }
  function deletedText(name) {
    return `${document}  ${name} ត្រូវបានលុបចេញពីប្រព័ន្ធ!`;
  }
  const serverError = "ម៉ាសុីនមេមានបញ្ហា សូមព្យាយាមម្តងទៀតពេលក្រោយ!";
  const existsText = `អ្នកប្រើប្រាស់ (សាអេឡិចត្រូនិច) មាននៅក្នុងប្រព័ន្ធរួចហើយ!`;
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
          { key: "firstname", label: "គ្គោត្តនាម" },
          { key: "lastname", label: "នាម" },
          { key: "contact", label: "លេខទំនាកទំនង" },
          { key: "email", label: "សារអេឡិចត្រូនិច" },
          { key: "organization", label: "ស្ថាប័ន/អង្គភាព" },
          { key: "password", label: "ពាក្យសម្ងាត់" },
          { key: "group_user_id", label: "ក្រុមអ្នកប្រើប្រាស់" },
        ];
        checkValidtion(res, req, requiredFields);

        // ───────────────────────────────────────────────
        // ✅ Get creator ID from session
        const { user_id: userId, user_data: { unit_id } = {} } = req.session;

        const {
          firstname,
          lastname,
          contact,
          email,
          organization,
          job_title,
          password,
          group_user_id,
          note,
          status,
        } = req.body;
        const titleResponse = firstname + " " + lastname;

        // ───────────────────────────────────────────────

        // ✅ Create new unit
        const exists = await UserModel.exists({ email });
        if (exists) {
          return res.json({
            success: false,
            message: existsText,
          });
        }
        const userData = await UserModel.findOne({ _id: userId });
        const is_super_admin = false;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const is_first_login = true;
        const saveData = await UserModel.create({
          firstname,
          lastname,
          contact,
          email,
          organization,
          job_title,
          password: hashedPassword,
          group_user_id,
          is_super_admin,
          is_first_login,
          unit_id: userData.unit_id,
          note,
          status,
          deleted: false, //  Hidden
          created_by: userId, //  Hidden
          updated_by: userId, //  Hidden
        });

        // ───────────────────────────────────────────────
        // ✅ Log activity
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
        // console.log("**********************");
        // console.log("**********************");
        // console.log("**********************");
        // console.log(">>>>>", err);
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

          var userData = await UserModel.findOne({
            _id: id,
            deleted: false,
          });

          if (!userData) {
            return res.status(404).json({
              success: false,
              message: notFoundData,
            });
          }

          const user = userData.toObject();
          delete user.password;

          // if not not super admin
          if (!user.is_super_admin) {
            // loading role
            const role = await modelGroupUser.findOne({
              _id: user.group_user_id,
            });
            if (role) {
              user.role = role;
            }
          }

          return res.status(200).json({ success: true, data: user });
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
        const { user_id: userId, user_data: { unit_id } = {} } = req.session;
        const result = await getFilteredMongoDB(
          req.query,
          UserModel,
          ["group_user_id"],
          [{ is_super_admin: false }],
          unit_id
        );

        const newData = result.data.map((row) => {
          const user = row.toObject();
          delete user.password;
          return user;
        });

        res.status(200).json({
          success: true,
          data: newData,
          pagination: result.pagination,
        });
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
        const { user_id: userId, user_data: { unit_id } = {} } = req.session;
        const result = await UserModel.find({
          unit_id,
          deleted: false,
        }); // Fetch all categories

        const newData = result.map((row) => {
          const user = row.toObject();
          delete user.password;
          return user;
        });

        res.status(200).json({
          success: true,
          data: newData,
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
        const updatedUnit = await UserModel.findByIdAndUpdate(
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
          title: `${document} ${
            updatedUnit.firstname + " " + updatedUnit.lastname
          } ត្រូវបានលុប!`,
          description: `គណនី: ${userEmail} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: logTitle,
          createdBy: userId,
          req,
        });

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(200).json({
          success: true,
          data: `${document} ${
            updatedUnit.firstname + " " + updatedUnit.lastname
          } បានលុប`,
          message: deletedText(
            `${updatedUnit.firstname + " " + updatedUnit.lastname}`
          ),
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
        const updatedUnit = await UserModel.findByIdAndUpdate(
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
          title: `${document} ${
            updatedUnit.firstname + " " + updatedUnit.lastname
          } ត្រូវបានកែប្រែ!`,
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
          message: updatedText(
            updatedUnit.firstname + " " + updatedUnit.lastname
          ),
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

  // Update password for admin
  prop.app.put(
    `${urlAPI}/reset-password/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        // ───────────────────────────────────────────────
        // ✅  ID
        const { id } = req.params;
        const { user_id: userId } = req.session;

        const requiredFields = [{ key: "password", label: "ពាក្យសម្ងាត់" }];
        checkValidtion(res, req, requiredFields);

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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        const updateFields = {
          password: hashedPassword,
          is_first_login: true,
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
        const updatedData = await UserModel.findByIdAndUpdate(
          id,
          updateFields,
          {
            new: true,
          }
        );

        if (!updatedData) {
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
          title: `${document} ${
            updatedData.firstname + " " + updatedData.lastname
          } ត្រូវបានកែប្រែ!`,
          description: `គណនី: ${userEmail} បានកំណត់ពាក្យស​ម្ងាត់ឡើងវិញ។`,
          categoryTitle: logTitle,
          createdBy: userId,
          req,
        });

        // ───────────────────────────────────────────────
        // ✅ Clear session
        await SessionModel.deleteMany({ user_id: updatedData._id });

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(200).json({
          success: true,
          data: updatedData,
          message: updatedText(
            updatedData.firstname + " " + updatedData.lastname
          ),
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

  // This for only new client login need to add new password after reset password from add
  prop.app.put(
    `${urlAPI}/update-password-no-token/:id`,
    prop.api_auth,
    async (req, res) => {
      try {
        // ───────────────────────────────────────────────
        // ✅  ID
        const { id } = req.params;

        const requiredFields = [{ key: "password", label: "ពាក្យសម្ងាត់" }];
        checkValidtion(res, req, requiredFields);

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
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        const updateFields = {
          password: hashedPassword,
          is_first_login: false,
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
        const updatedData = await UserModel.findByIdAndUpdate(
          id,
          updateFields,
          {
            new: true,
          }
        );

        if (!updatedData) {
          return res.status(404).json({
            success: false,
            message: noDataFound,
          });
        }

        // ───────────────────────────────────────────────
        // ✅ Response
        res.status(200).json({
          success: true,
          data: updatedData,
          message: updatedText(
            updatedData.firstname + " " + updatedData.lastname
          ),
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
