const mongoose = require("mongoose");
const Model = require("./version_log.model");
const UserModel = require("../../user/user.model");
const { logActivity } = require("../../../../util/log");

const route = (prop) => {
  // **************** Declaration ****************
  // Route
  const baseRoute = "system/version/log";
  const urlAPI = `/${prop.main_route}/${baseRoute}`;
  // Log
  const logTitle = "version_log";
  // Error Content
  const document = "បច្ចុប្បន្នភាព";

  function updatedText(name) {
    return `${document} ${name} ត្រូវបានកែប្រែ និងរក្សារទុក!`;
  }
  function deletedText(name) {
    return `${document}  ${name} ត្រូវបានលុបចេញពីប្រព័ន្ធ!`;
  }
  const serverError = "ម៉ាសុីនមេមានបញ្ហា សូមព្យាយាមម្តងទៀតពេលក្រោយ!";
  const existsText = `គណនីសាច់ប្រាក់ មាននៅក្នុងប្រព័ន្ធរួចហើយ!`;
  const noDataFound = `មិនមាន${document}នៅក្នុងប្រព័ន្ធ!`;
  const newSave = `${document} ថ្មីត្រូវបានរក្សារទុក!`;
  const noIDFound = "មិនមាន ID ត្រឹមត្រូវ!";
  const notFoundData = "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!";
  const noDataUpdate = "មិនមានទិន្នន័យដើម្បីកែប្រែ!";
  // ************************************************

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
  // ************************************************

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
          { key: "title", label: "required : title" },
          { key: "description", label: "required : description" },
          { key: "version_number", label: "required : version_number" },
          { key: "version_build", label: "required : version_build" },
        ];
        checkValidtion(res, req, requiredFields);
        // ───────────────────────────────────────────────
        // ✅ Get creator ID from session
        const { user_id: userId, user_data: { unit_id } = {} } = req.session;

        const { title, note, description, version_number, version_build } =
          req.body;
        const titleResponse = title;

        // ───────────────────────────────────────────────
        // ✅ Create new unit
        const saveData = await Model.create({
          title,
          description,
          version_number,
          version_build,
          note,
          status: true,
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
    },
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
          (key) => updateFields[key] == null && delete updateFields[key],
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
        const updatedUnit = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
        });

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
            updateFields,
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
    },
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
          (key) => updateFields[key] == null && delete updateFields[key],
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
        const updatedUnit = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
        });

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
          message: deletedText(updatedUnit.name),
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: serverError,
          error: err,
        });
      }
    },
  );

  prop.app.get(
    `${urlAPI}/:id`, // optional ":id"
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
              message: noIDFound,
            });
          }

          const unit = await Model.findOne({
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
          message: serverError,
          error: err,
        });
      }
    },
  );

  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId, user_data: { unit_id } = {} } = req.session;

        // ─── Pagination ───────────────────────────────────
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // ─── Sorting ──────────────────────────────────────
        const sortField = req.query.sort || "created_date";
        const sortOrder = req.query.order === "asc" ? 1 : -1; // default: desc

        // ─── Search ───────────────────────────────────────
        const keyword = req.query.q?.trim();
        const qKeys = req.query.q_key;

        let searchFilter = {};

        if (keyword && qKeys) {
          let fields = [];

          // Handle array or comma-separated string
          if (Array.isArray(qKeys)) {
            fields = qKeys;
          } else if (typeof qKeys === "string") {
            try {
              fields = JSON.parse(qKeys); // Expects JSON string
            } catch {
              fields = qKeys.split(","); // fallback for comma-separated values
            }
          }

          searchFilter = {
            $or: fields.map((field) => ({
              [field]: { $regex: keyword, $options: "i" },
            })),
          };
        }

        // ─── Soft delete toggle ───────────────────────────
        const includeDeleted = req.query.includeDeleted === "true";
        const deleteFilter = includeDeleted ? {} : { deleted: false };
        const unitFilter = { };

        // ─── Final query filter ───────────────────────────
        const finalFilter = { ...searchFilter, ...deleteFilter, ...unitFilter };

        // ─── Fetch data and total count ───────────────────
        const [units, total] = await Promise.all([
          Model.find(finalFilter)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit),
          Model.countDocuments(finalFilter),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
          success: true,
          data: units,
          pagination: {
            total,
            totalPages,
            currentPage: page,
            pageSize: limit,
          },
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: serverError,
          error: err,
        });
      }
    },
  );

  prop.app.get(
    `${urlAPI}-all`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const data = await Model.find();

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
    },
  );


};

module.exports = route;
