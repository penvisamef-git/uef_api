const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "academic/student-in-class";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelClass = require("../class/model");
const ModelSubject = require("../../subject_and_time/subject/model");
const ModelStudent = require("../../student_mgt/student/model");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Enroll student in class
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
          { key: "student_joined", label: "ប្រភេទនិស្សិត" },
          { key: "student_id", label: "និស្សិត" },
          { key: "class_id", label: "ថ្នាក់" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const {
          student_joined,
          student_id,
          class_id,
          scores,
          total_absent_session,
          note,
          status,
        } = req.body;

        // Validate student_joined
        const validJoinedTypes = ["passed_previous", "add_subject", "new_student"];
        if (!validJoinedTypes.includes(student_joined)) {
          return res.status(400).json({
            success: false,
            message: "សូមជ្រើសរើសប្រភេទនិស្សិត: passed_previous, add_subject, ឬ new_student",
          });
        }

        // Check if student exists
        const student = await ModelStudent.findOne({
          _id: student_id,
          deleted: false,
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "និស្សិតនេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if class exists
        const classData = await ModelClass.findOne({
          _id: class_id,
          deleted: false,
        });

        if (!classData) {
          return res.status(404).json({
            success: false,
            message: "ថ្នាក់នេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Check if student already enrolled in this class
        const existingEnrollment = await Model.findOne({
          student_id: student_id,
          class_id: class_id,
          deleted: false,
        });

        if (existingEnrollment) {
          return res.status(400).json({
            success: false,
            message: "និស្សិតនេះបានចុះឈ្មោះក្នុងថ្នាក់នេះរួចហើយ!",
          });
        }

        // Validate scores if provided
        if (scores && Array.isArray(scores) && scores.length > 0) {
          for (const score of scores) {
            // Check if subject exists
            const subject = await ModelSubject.findOne({
              _id: score.subject_id,
              deleted: false,
            });

            if (!subject) {
              return res.status(404).json({
                success: false,
                message: `មុខវិជ្ជានេះមិនមានក្នុងប្រព័ន្ធ!`,
              });
            }

            // Validate score ranges
            if (score.midterm < 0 || score.midterm > 25) {
              return res.status(400).json({
                success: false,
                message: "ពិន្ទុប្រឡងពាក់កណ្តាលឆមាសត្រូវតែចន្លោះពី 0 ដល់ 25!",
              });
            }

            if (score.final < 0 || score.final > 45) {
              return res.status(400).json({
                success: false,
                message: "ពិន្ទុប្រឡងចុងឆមាសត្រូវតែចន្លោះពី 0 ដល់ 45!",
              });
            }

            if (score.assignment < 0 || score.assignment > 20) {
              return res.status(400).json({
                success: false,
                message: "ពិន្ទុកិច្ចការត្រូវតែចន្លោះពី 0 ដល់ 20!",
              });
            }

            if (score.attendance < 0 || score.attendance > 10) {
              return res.status(400).json({
                success: false,
                message: "ពិន្ទុវត្តមានត្រូវតែចន្លោះពី 0 ដល់ 10!",
              });
            }

            // Calculate total if not provided
            if (!score.total || score.total === 0) {
              score.total = (score.midterm || 0) + (score.final || 0) + (score.assignment || 0) + (score.attendance || 0);
            }

            // Determine grade based on total
            if (!score.grade) {
              const total = score.total;
              if (total >= 90) score.grade = "A";
              else if (total >= 80) score.grade = "B";
              else if (total >= 70) score.grade = "C";
              else if (total >= 60) score.grade = "D";
              else score.grade = "F";
            }

            // Determine pass/fail
            if (score.is_passed === undefined) {
              score.is_passed = score.total >= 60;
            }
          }
        }

        // Save
        const saveData = await Model.create({
          student_joined: student_joined,
          student_id: student_id,
          class_id: class_id,
          scores: scores || [],
          total_absent_session: total_absent_session || 0,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Populate data for response
        const populatedData = await Model.findById(saveData._id)
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id");

        // Log
        const studentName = `${student.firstname} ${student.lastname}`;
        await logActivity({
          title: `និស្សិត: ${studentName} បានចុះឈ្មោះចូលរៀនក្នុងថ្នាក់: ${classData.code}`,
          description: `ចុះឈ្មោះដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: populatedData,
          message: `បានចុះឈ្មោះនិស្សិត ${studentName} ចូលថ្នាក់ ${classData.code} ដោយជោគជ័យ!`,
        });
      } catch (error) {
        console.error("❌ Error enrolling student:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "និស្សិតនេះបានចុះឈ្មោះក្នុងថ្នាក់នេះរួចហើយ!",
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
          message: "មានបញ្ហាក្នុងការចុះឈ្មោះនិស្សិត! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single enrollment
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
          })
            .populate("student_id")
            .populate("class_id")
            .populate("scores.subject_id");

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
  // GET BY STUDENT - Get enrollments by student_id
  // ==========================================
  prop.app.get(
    `${urlAPI}/student/:student_id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { student_id } = req.params;

        if (!student_id) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនលេខសម្គាល់និស្សិត!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(student_id)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់និស្សិតមិនត្រឹមត្រូវ!",
          });
        }

        // Check if student exists
        const student = await ModelStudent.findOne({
          _id: student_id,
          deleted: false,
        });

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "និស្សិតនេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Get all enrollments for this student
        const data = await Model.find({
          student_id: student_id,
          deleted: false,
        })
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id")
          .sort({ created_date: -1 });

        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            student: student,
            enrollments: data,
            total_enrollments: data.length,
          },
        });
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
  // GET BY CLASS - Get enrollments by class_id
  // ==========================================
  prop.app.get(
    `${urlAPI}/class/:class_id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { class_id } = req.params;

        if (!class_id) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនលេខសម្គាល់ថ្នាក់!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(class_id)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់ថ្នាក់មិនត្រឹមត្រូវ!",
          });
        }

        // Check if class exists
        const classData = await ModelClass.findOne({
          _id: class_id,
          deleted: false,
        });

        if (!classData) {
          return res.status(404).json({
            success: false,
            message: "ថ្នាក់នេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        // Get all enrollments for this class
        const data = await Model.find({
          class_id: class_id,
          deleted: false,
        })
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id")
          .sort({ created_date: -1 });

        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            class: classData,
            students: data,
            total_students: data.length,
          },
        });
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
  // GET ALL - Get all enrollments
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
        })
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id");

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

  // ==========================================
  // UPDATE - Update enrollment
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
        const {
          student_joined,
          student_id,
          class_id,
          scores,
          total_absent_session,
          note,
          status,
        } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if enrollment exists
        const existingEnrollment = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingEnrollment) {
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

        // Validate and add fields if provided
        if (student_joined !== undefined && student_joined !== null) {
          const validJoinedTypes = ["passed_previous", "add_subject", "new_student"];
          if (!validJoinedTypes.includes(student_joined)) {
            return res.status(400).json({
              success: false,
              message: "សូមជ្រើសរើសប្រភេទនិស្សិត: passed_previous, add_subject, ឬ new_student",
            });
          }
          updateFields.student_joined = student_joined;
        }

        if (student_id !== undefined && student_id !== null) {
          const student = await ModelStudent.findOne({
            _id: student_id,
            deleted: false,
          });

          if (!student) {
            return res.status(404).json({
              success: false,
              message: "និស្សិតនេះមិនមានក្នុងប្រព័ន្ធ!",
            });
          }

          // Check if student already enrolled in this class
          const duplicateEnrollment = await Model.findOne({
            student_id: student_id,
            class_id: class_id || existingEnrollment.class_id,
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateEnrollment) {
            return res.status(400).json({
              success: false,
              message: "និស្សិតនេះបានចុះឈ្មោះក្នុងថ្នាក់នេះរួចហើយ!",
            });
          }

          updateFields.student_id = student_id;
        }

        if (class_id !== undefined && class_id !== null) {
          const classData = await ModelClass.findOne({
            _id: class_id,
            deleted: false,
          });

          if (!classData) {
            return res.status(404).json({
              success: false,
              message: "ថ្នាក់នេះមិនមានក្នុងប្រព័ន្ធ!",
            });
          }

          // Check if student already enrolled in this class
          const duplicateEnrollment = await Model.findOne({
            student_id: student_id || existingEnrollment.student_id,
            class_id: class_id,
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateEnrollment) {
            return res.status(400).json({
              success: false,
              message: "និស្សិតនេះបានចុះឈ្មោះក្នុងថ្នាក់នេះរួចហើយ!",
            });
          }

          updateFields.class_id = class_id;
        }

        if (scores !== undefined && scores !== null) {
          // Validate scores
          if (Array.isArray(scores)) {
            for (const score of scores) {
              const subject = await ModelSubject.findOne({
                _id: score.subject_id,
                deleted: false,
              });

              if (!subject) {
                return res.status(404).json({
                  success: false,
                  message: `មុខវិជ្ជានេះមិនមានក្នុងប្រព័ន្ធ!`,
                });
              }

              if (score.midterm < 0 || score.midterm > 25) {
                return res.status(400).json({
                  success: false,
                  message: "ពិន្ទុប្រឡងពាក់កណ្តាលឆមាសត្រូវតែចន្លោះពី 0 ដល់ 25!",
                });
              }

              if (score.final < 0 || score.final > 45) {
                return res.status(400).json({
                  success: false,
                  message: "ពិន្ទុប្រឡងចុងឆមាសត្រូវតែចន្លោះពី 0 ដល់ 45!",
                });
              }

              if (score.assignment < 0 || score.assignment > 20) {
                return res.status(400).json({
                  success: false,
                  message: "ពិន្ទុកិច្ចការត្រូវតែចន្លោះពី 0 ដល់ 20!",
                });
              }

              if (score.attendance < 0 || score.attendance > 10) {
                return res.status(400).json({
                  success: false,
                  message: "ពិន្ទុវត្តមានត្រូវតែចន្លោះពី 0 ដល់ 10!",
                });
              }

              // Calculate total if not provided
              if (!score.total || score.total === 0) {
                score.total = (score.midterm || 0) + (score.final || 0) + (score.assignment || 0) + (score.attendance || 0);
              }

              // Determine grade based on total
              if (!score.grade) {
                const total = score.total;
                if (total >= 90) score.grade = "A";
                else if (total >= 80) score.grade = "B";
                else if (total >= 70) score.grade = "C";
                else if (total >= 60) score.grade = "D";
                else score.grade = "F";
              }

              // Determine pass/fail
              if (score.is_passed === undefined) {
                score.is_passed = score.total >= 60;
              }
            }
          }
          updateFields.scores = scores;
        }

        if (total_absent_session !== undefined && total_absent_session !== null) {
          updateFields.total_absent_session = total_absent_session;
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
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនទិន្នន័យដែលត្រូវកែប្រែ!",
          });
        }

        // Update
        const updatedData = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
        })
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id");

        // Log
        await logActivity({
          title: `បានកែប្រែការចុះឈ្មោះនិស្សិតក្នុងថ្នាក់!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ការចុះឈ្មោះនិស្សិតត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating enrollment:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "និស្សិតនេះបានចុះឈ្មោះក្នុងថ្នាក់នេះរួចហើយ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែការចុះឈ្មោះនិស្សិត!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete enrollment (move to trash)
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

        // Check if enrollment exists
        const enrollment = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!enrollment) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedEnrollment = await Model.findByIdAndUpdate(
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
          title: `ការចុះឈ្មោះនិស្សិតត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedEnrollment,
          message: "ទិន្នន័យត្រូវបានផ្លាស់ទៅធុងសំរាម!",
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការលុបទិន្នន័យ!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // RESTORE - Restore soft deleted enrollment
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

        // Check if enrollment exists and is deleted
        const enrollment = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!enrollment) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredEnrollment = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        )
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id");

        // Log
        await logActivity({
          title: `ការចុះឈ្មោះនិស្សិតត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredEnrollment,
          message: "ទិន្នន័យត្រូវបានស្ដារមកវិញ!",
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការស្ដារទិន្នន័យ!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // DELETE FOREVER - Permanently delete enrollment
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

        // Check if enrollment exists
        const enrollment = await Model.findOne({
          _id: id,
        });

        if (!enrollment) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `ការចុះឈ្មោះនិស្សិតត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          message: "ទិន្នន័យត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!",
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការលុបទិន្នន័យជាអចិន្ត្រៃយ៍!",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET TRASH - Get all soft deleted enrollments
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
        })
          .populate("student_id")
          .populate("class_id")
          .populate("scores.subject_id");

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

        // Populate data
        const populatedData = await Model.populate(result.data, [
          { path: "student_id" },
          { path: "class_id" },
          { path: "scores.subject_id" },
        ]);

        const newData = populatedData.map((row) => {
          const data = row.toObject();
          return data;
        });

        res.status(200).json({
          success: true,
          data: newData,
          pagination: result.pagination,
        });
      } catch (err) {
        console.error("❌ Error:", err);
        res.status(500).json({ success: false, message: err.message });
      }
    },
  );
};

module.exports = route;