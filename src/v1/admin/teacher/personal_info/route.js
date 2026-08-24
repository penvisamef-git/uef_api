const mongoose = require("mongoose");
const Model = require("../../dashboard/student_mgt/teacher/model");
const getFilteredMongoDB = require("../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "teacher/student-management/teacher";
const { logActivity } = require("./../../../../util/log");
const { checkValidtion } = require("./../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // Helper function to remove password from response
  const sanitizeTeacher = (teacher) => {
    if (!teacher) return teacher;
    const teacherObj = teacher.toObject ? teacher.toObject() : { ...teacher };
    delete teacherObj.password;
    return teacherObj;
  };

  const sanitizeTeachers = (teachers) => {
    if (!teachers || !Array.isArray(teachers)) return teachers;
    return teachers.map((teacher) => {
      const teacherObj = teacher.toObject ? teacher.toObject() : { ...teacher };
      delete teacherObj.password;
      return teacherObj;
    });
  };

  // ==========================================
  // GET BY ID - Get single teacher
  // ==========================================
  prop.app.get(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        
        // ✅ FIX: Convert Buffer to string if needed
        let id = userId;
        
        // If userId is a Buffer, convert to string
        if (Buffer.isBuffer(userId)) {
          id = userId.toString('hex');
        }
        
        // If userId is an object with toString method
        if (userId && typeof userId.toString === 'function' && !Buffer.isBuffer(userId)) {
          id = userId.toString();
        }

        // ✅ Check if id is valid ObjectId
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
          console.error("❌ Invalid ID format:", id);
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // ✅ Convert to ObjectId
        const objectId = new mongoose.Types.ObjectId(id);

        const data = await Model.findOne({
          _id: objectId,
          deleted: false,
        });

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Remove password from response
        const sanitizedData = sanitizeTeacher(data);

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: sanitizedData });
          
      } catch (err) {
        console.error("❌ Error in GET teacher:", err);
        res.status(500).json({
          success: false,
          message: "Internal Error",
          error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }
    },
  );


 // ==========================================
// UPDATE - Update teacher (using session ID)
// ==========================================
prop.app.put(
  `${urlAPI}`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const { user_id: userId, user_data: user_data } = req.session;
      const { email, ...updateData } = req.body;

      // ✅ Fix: Convert userId from Buffer if needed
      let userIdStr = userId;
      if (Buffer.isBuffer(userId)) {
        userIdStr = userId.toString('hex');
      } else if (userId && typeof userId.toString === 'function' && !Buffer.isBuffer(userId)) {
        userIdStr = userId.toString();
      }

      // ✅ Validate session user ID
      if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
        return res.status(400).json({
          success: false,
          message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
        });
      }

      // ✅ Convert to ObjectId for query
      const objectId = new mongoose.Types.ObjectId(userIdStr);

      // ✅ Check if teacher exists using session ID
      const existingTeacher = await Model.findOne({
        _id: objectId,
        deleted: false,
      });

      if (!existingTeacher) {
        return res.status(404).json({
          success: false,
          message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
        });
      }

      // ✅ Build update object
      const updateFields = {
        ...updateData,
        updated_by: objectId, // Use ObjectId directly
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

      // ✅ Update teacher using session ID
      const updatedData = await Model.findByIdAndUpdate(
        objectId, 
        updateFields, 
        {
          new: true,
          runValidators: true,
        }
      );

      // ✅ Log activity
      await logActivity({
        title: `គ្រូបង្រៀន: ${updatedData.firstname} ${updatedData.lastname} ត្រូវបានកែប្រែ!`,
        description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
        categoryTitle: "teacher_management",
        createdBy: objectId,
        req,
      });

      // Remove password from response
      const sanitizedData = sanitizeTeacher(updatedData);

      res.status(200).json({
        success: true,
        data: sanitizedData,
        message: "ព័ត៌មានគ្រូបង្រៀនត្រូវបានកែប្រែ!",
      });
      
    } catch (error) {
      console.error("❌ Error updating teacher:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "អ៊ីមែលនេះមានរួចហើយ!",
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "មានបញ្ហាក្នុងការកែប្រែព័ត៌មានគ្រូបង្រៀន!",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);
};

module.exports = route;