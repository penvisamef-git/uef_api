const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "logs/class";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

// Import related models for population
const ModelClass = require("../class/model");
const ModelTeacher = require("../../student_mgt/teacher/model");
const ModelStudent = require("../../student_mgt/student/model");
const ModelSubject = require("../../subject_and_time/subject/model");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // CREATE - Create new student attendance log
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
          { key: "class_id", label: "ថ្នាក់" },
          { key: "teacher_id", label: "គ្រូបង្រៀន" },
          { key: "student_id", label: "សិស្ស" },
          { key: "subject_id", label: "មុខវិជ្ជា" },
          { key: "current_session", label: "វគ្គបច្ចុប្បន្ន" },
          { key: "schedule_session", label: "កាលវិភាគវគ្គ" },
          { key: "attendace_status", label: "ស្ថានភាពវត្តមាន" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: user_data } = req.session;

        // Field
        const {
          class_id,
          teacher_id,
          student_id,
          subject_id,
          current_session,
          schedule_session,
          attendace_status,
          note,
          status,
        } = req.body;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(class_id)) {
          return res.status(400).json({
            success: false,
            message: "ID ថ្នាក់មិនត្រឹមត្រូវ!",
          });
        }
        if (!mongoose.Types.ObjectId.isValid(teacher_id)) {
          return res.status(400).json({
            success: false,
            message: "ID គ្រូបង្រៀនមិនត្រឹមត្រូវ!",
          });
        }
        if (!mongoose.Types.ObjectId.isValid(student_id)) {
          return res.status(400).json({
            success: false,
            message: "ID សិស្សមិនត្រឹមត្រូវ!",
          });
        }
        if (!mongoose.Types.ObjectId.isValid(subject_id)) {
          return res.status(400).json({
            success: false,
            message: "ID មុខវិជ្ជាមិនត្រឹមត្រូវ!",
          });
        }

 

        // Save
        const saveData = await Model.create({
          class_id: class_id,
          teacher_id: teacher_id,
          student_id: student_id,
          subject_id: subject_id,
          current_session: current_session.trim(),
          schedule_session: new Date(schedule_session),
          attendace_status: attendace_status,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Populate the created data
        const populatedData = await Model.findById(saveData._id)
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname");

        // Log
        await logActivity({
          title: `កំណត់ត្រាវត្តមានថ្មី: ${populatedData.student_id.firstname + " " + populatedData.student_id.lastname}`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "class_logs",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: populatedData,
          message: `កំណត់ត្រាវត្តមានថ្មីត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating attendance log:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កំណត់ត្រាវត្តមាននេះមានរួចហើយក្នុងប្រព័ន្ធ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតកំណត់ត្រាវត្តមាន! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );



  // ==========================================
// CREATE GROUP - Create attendance logs for multiple students
// ==========================================
prop.app.post(
  `${urlAPI}-group-of-student`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      // Validation
      const requiredFields = [
        { key: "class_id", label: "ថ្នាក់" },
        { key: "teacher_id", label: "គ្រូបង្រៀន" },
        { key: "student_id_as_list", label: "សិស្ស" },
        { key: "subject_id", label: "មុខវិជ្ជា" },
        { key: "current_session", label: "វគ្គបច្ចុប្បន្ន" },
        { key: "schedule_session", label: "កាលវិភាគវគ្គ" },
      ];
      checkValidtion(res, req, requiredFields);

      // Get userLogin
      const { user_id: userId, user_data: user_data } = req.session;

      // Field
      const {
        class_id,
        teacher_id,
        student_id_as_list,
        subject_id,
        current_session,
        schedule_session,
        note,
        status,
      } = req.body;

      // Validate student_id_as_list is an array
      if (!Array.isArray(student_id_as_list)) {
        return res.status(400).json({
          success: false,
          message: "student_id_as_list ត្រូវតែជា Array!",
        });
      }

      // Validate student list is not empty
      if (student_id_as_list.length === 0) {
        return res.status(400).json({
          success: false,
          message: "សូមបញ្ជូនបញ្ជីសិស្សយ៉ាងហោចណាស់ម្នាក់!",
        });
      }

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(class_id)) {
        return res.status(400).json({
          success: false,
          message: "ID ថ្នាក់មិនត្រឹមត្រូវ!",
        });
      }
      if (!mongoose.Types.ObjectId.isValid(teacher_id)) {
        return res.status(400).json({
          success: false,
          message: "ID គ្រូបង្រៀនមិនត្រឹមត្រូវ!",
        });
      }
      if (!mongoose.Types.ObjectId.isValid(subject_id)) {
        return res.status(400).json({
          success: false,
          message: "ID មុខវិជ្ជាមិនត្រឹមត្រូវ!",
        });
      }

      const ClassModel = require("../class/model"); // Import Class model
      
      // Find the class
      const classData = await ClassModel.findOne({
        _id: class_id,
        deleted: false,
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "មិនមានថ្នាក់ក្នុងប្រព័ន្ធ!",
        });
      }

      // Validate each student in the list
      const validStudents = [];
      const invalidStudents = [];
      const duplicateStudents = [];
      const studentIds = [];

      // Allowed attendance statuses
      const allowedStatuses = ['present', 'absent', 'late', 'absent-report'];

      for (const student of student_id_as_list) {
        // Check if student has student_id
        if (!student.student_id) {
          invalidStudents.push({
            student: student,
            error: "Missing student_id field"
          });
          continue;
        }

        // Validate student_id format
        if (!mongoose.Types.ObjectId.isValid(student.student_id)) {
          invalidStudents.push({
            student: student,
            error: "Invalid student_id format"
          });
          continue;
        }

        // Validate attendance status
        if (student.attendace_status && !allowedStatuses.includes(student.attendace_status)) {
          invalidStudents.push({
            student: student,
            error: `Invalid attendace_status: ${student.attendace_status}. Allowed: ${allowedStatuses.join(', ')}`
          });
          continue;
        }

        // Check for duplicate student_id in the list
        if (studentIds.includes(student.student_id)) {
          duplicateStudents.push(student.student_id);
          continue;
        }

        studentIds.push(student.student_id);
        validStudents.push(student);
      }

      // Return error if there are duplicates
      if (duplicateStudents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `សូមកុំបញ្ចូល ID សិស្សដដែលៗ!`,
          duplicate_students: duplicateStudents,
        });
      }

      // Return error if there are invalid students
      if (invalidStudents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `មានសិស្សមួយចំនួនមិនត្រឹមត្រូវ!`,
          invalid_students: invalidStudents,
        });
      }

     

      // Prepare data for bulk insert with individual attendance status
      const logsToCreate = validStudents.map((student) => ({
        class_id: class_id,
        teacher_id: teacher_id,
        student_id: student.student_id,
        subject_id: subject_id,
        current_session: current_session.trim(),
        schedule_session: new Date(schedule_session),
        attendace_status: student.attendace_status || 'present',
        note: student.note || note || "",
        status: student.status !== undefined ? student.status : (status !== undefined ? status : true),
        deleted: false,
        created_by: userId,
        updated_by: userId,
      }));

      // Bulk insert all logs
      const savedLogs = await Model.insertMany(logsToCreate);

      // Populate the created data
      const populatedData = await Model.find({
        _id: { $in: savedLogs.map(log => log._id) }
      })
        .populate("class_id", "name")
        .populate("teacher_id", "firstname lastname")
        .populate("student_id", "firstname lastname")
        .populate("subject_id", "name")
        .populate("created_by", "firstname lastname")
        .populate("updated_by", "firstname lastname");

      // ==========================================
      // UPDATE CLASS - Increment session_have_teach
      // ==========================================

      // Find the subject schedule in the class
      let subjectFound = false;
      const updatedSchedule = classData.schedule.map((scheduleItem) => {
        if (scheduleItem.subject_id.toString() === subject_id.toString()) {
          subjectFound = true;
          // Increment session_have_teach by 1
          return {
            ...scheduleItem.toObject(),
            session_have_teach: (scheduleItem.session_have_teach || 0) + 1,
          };
        }
        return scheduleItem;
      });

      if (!subjectFound) {
        return res.status(404).json({
          success: false,
          message: "មុខវិជ្ជានេះមិនមានក្នុងថ្នាក់!",
        });
      }

      // ==========================================
      // UPDATE STUDENTS - Update attendance records
      // ==========================================
      const updatedStudents = classData.students.map((student) => {
        // Check if this student is in the list
        const studentInList = validStudents.find(
          (s) => s.student_id === student.student_id.toString()
        );

        if (studentInList) {
          // Get the attendance status from the list
          const attendanceStatus = studentInList.attendace_status || 'present';
          
          // Check if attendance for this subject already exists
          const existingAttendanceIndex = student.attendance.findIndex(
            (att) => att.subject_id.toString() === subject_id.toString()
          );

          let updatedAttendance = [...student.attendance];

          if (existingAttendanceIndex !== -1) {
            // Update existing attendance
            const existingAtt = student.attendance[existingAttendanceIndex];
            let updatedAtt = { ...existingAtt.toObject() };

            // Handle different attendance statuses
            if (attendanceStatus === 'absent') {
              // Absent without report - increment total_absence_unreport
              updatedAtt.total_absence_unreport = (updatedAtt.total_absence_unreport || 0) + 1;
            } else if (attendanceStatus === 'absent-report') {
              // Absent with report - increment total_absence_report
              updatedAtt.total_absence_report = (updatedAtt.total_absence_report || 0) + 1;
            } 
            // 'present' - no changes to attendance counts

            updatedAttendance[existingAttendanceIndex] = updatedAtt;
          } else {
            // Create new attendance record
            let totalAbsenceUnreport = 0;
            let totalAbsenceReport = 0;

            if (attendanceStatus === 'absent') {
              totalAbsenceUnreport = 1;
            } else if (attendanceStatus === 'absent-report') {
              totalAbsenceReport = 1;
            } else if (attendanceStatus === 'late') {
              totalAbsenceUnreport = 1;
            }
            // 'present' - both remain 0

            const newAttendance = {
              subject_id: subject_id,
              total_absence_unreport: totalAbsenceUnreport,
              total_absence_report: totalAbsenceReport,
            };
            updatedAttendance.push(newAttendance);
          }

          return {
            ...student.toObject(),
            attendance: updatedAttendance,
          };
        }
        return student;
      });

      // Update the class with new schedule and students
      const updatedClass = await ClassModel.findByIdAndUpdate(
        class_id,
        {
          schedule: updatedSchedule,
          students: updatedStudents,
          updated_by: userId,
        },
        { new: true }
      )
        .populate("schedule.subject_id", "name code")
        .populate("schedule.teacher_id", "firstname lastname")
        .populate("schedule.room_id", "name")
        .populate("students.student_id", "firstname lastname")
        .populate("degree_level_id", "name")
        .populate("major_id", "name")
        .populate("year_study_id", "name")
        .populate("semester_id", "name")
        .populate("shift_id", "name")
        .populate("room_id", "name");

      // Log activity
      const studentNames = populatedData.map(log => 
        `${log.student_id.firstname} ${log.student_id.lastname} (${log.attendace_status})`
      ).join(', ');

      await logActivity({
        title: `កំណត់ត្រាវត្តមានថ្មីសម្រាប់សិស្ស ${populatedData.length} នាក់`,
        description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}\nសិស្ស: ${studentNames}\nមុខវិជ្ជា: ${populatedData[0]?.subject_id?.name || ''}`,
        categoryTitle: "class_logs",
        createdBy: userId,
        req,
      });

      res.status(200).json({
        success: true,
        data: populatedData,
        class_updated: updatedClass,
        count: populatedData.length,
        message: `កំណត់ត្រាវត្តមានថ្មីសម្រាប់សិស្ស ${populatedData.length} នាក់ត្រូវបានបង្កើត!`,
      });
    } catch (error) {
      console.error("❌ Error creating attendance logs:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "កំណត់ត្រាវត្តមានមួយចំនួនមានរួចហើយក្នុងប្រព័ន្ធ!",
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
        message: "មានបញ្ហាក្នុងការបង្កើតកំណត់ត្រាវត្តមាន! សូមព្យាយាមម្តងទៀត",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);





  // ==========================================
  // GET BY ID - Get single attendance log
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
            .populate("class_id", "name")
            .populate("teacher_id", "firstname lastname")
            .populate("student_id", "firstname lastname")
            .populate("subject_id", "name")
            .populate("created_by", "firstname lastname")
            .populate("updated_by", "firstname lastname");

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
  // GET ALL - Get all attendance logs
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
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ created_date: -1 });

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
  // UPDATE - Update attendance log
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
          class_id,
          teacher_id,
          student_id,
          subject_id,
          current_session,
          schedule_session,
          attendace_status,
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

        // Check if attendance log exists
        const existingLog = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingLog) {
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
        if (class_id !== undefined && class_id !== null) {
          if (!mongoose.Types.ObjectId.isValid(class_id)) {
            return res.status(400).json({
              success: false,
              message: "ID ថ្នាក់មិនត្រឹមត្រូវ!",
            });
          }
          updateFields.class_id = class_id;
        }

        if (teacher_id !== undefined && teacher_id !== null) {
          if (!mongoose.Types.ObjectId.isValid(teacher_id)) {
            return res.status(400).json({
              success: false,
              message: "ID គ្រូបង្រៀនមិនត្រឹមត្រូវ!",
            });
          }
          updateFields.teacher_id = teacher_id;
        }

        if (student_id !== undefined && student_id !== null) {
          if (!mongoose.Types.ObjectId.isValid(student_id)) {
            return res.status(400).json({
              success: false,
              message: "ID សិស្សមិនត្រឹមត្រូវ!",
            });
          }
          updateFields.student_id = student_id;
        }

        if (subject_id !== undefined && subject_id !== null) {
          if (!mongoose.Types.ObjectId.isValid(subject_id)) {
            return res.status(400).json({
              success: false,
              message: "ID មុខវិជ្ជាមិនត្រឹមត្រូវ!",
            });
          }
          updateFields.subject_id = subject_id;
        }

        if (current_session !== undefined && current_session !== null) {
          updateFields.current_session = current_session.trim();
        }

        if (schedule_session !== undefined && schedule_session !== null) {
          updateFields.schedule_session = new Date(schedule_session);
        }

        if (attendace_status !== undefined && attendace_status !== null) {
          updateFields.attendace_status = attendace_status;
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
        })
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname");

        // Log
        await logActivity({
          title: `កំណត់ត្រាវត្តមានត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "class_logs",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "កំណត់ត្រាវត្តមានត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating attendance log:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កំណត់ត្រាវត្តមាននេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែកំណត់ត្រាវត្តមាន!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete attendance log (move to trash)
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

        // Check if attendance log exists
        const log = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!log) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedLog = await Model.findByIdAndUpdate(
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
          title: `កំណត់ត្រាវត្តមានត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "class_logs",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedLog,
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
  // RESTORE - Restore soft deleted attendance log
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

        // Check if attendance log exists and is deleted
        const log = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!log) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredLog = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        )
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname");

        // Log
        await logActivity({
          title: `កំណត់ត្រាវត្តមានត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "class_logs",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredLog,
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
  // DELETE FOREVER - Permanently delete attendance log
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

        // Check if attendance log exists
        const log = await Model.findOne({
          _id: id,
        });

        if (!log) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `កំណត់ត្រាវត្តមានត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
          categoryTitle: "class_logs",
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
  // GET TRASH - Get all soft deleted attendance logs
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
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ deleted_at: -1 });

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
  // GET - Pagination with filters
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

        // Populate the data
        const populatedData = await Model.populate(result.data, [
          { path: "class_id", select: "name" },
          { path: "teacher_id", select: "firstname lastname" },
          { path: "student_id", select: "firstname lastname" },
          { path: "subject_id", select: "name" },
          { path: "created_by", select: "firstname lastname" },
          { path: "updated_by", select: "firstname lastname" },
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
        res.status(500).json({ success: false, message: err.message });
      }
    },
  );

  // ==========================================
  // GET BY CLASS - Get attendance logs by class
  // ==========================================
  prop.app.get(
    `${urlAPI}/class/:classId`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { classId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(classId)) {
          return res.status(400).json({
            success: false,
            message: "ID ថ្នាក់មិនត្រឹមត្រូវ!",
          });
        }

        const result = await Model.find({
          class_id: classId,
          deleted: false,
        })
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ created_date: -1 });

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
  // GET BY STUDENT - Get attendance logs by student
  // ==========================================
  prop.app.get(
    `${urlAPI}/student/:studentId`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            message: "ID សិស្សមិនត្រឹមត្រូវ!",
          });
        }

        const result = await Model.find({
          student_id: studentId,
          deleted: false,
        })
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ created_date: -1 });

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
  // GET BY TEACHER - Get attendance logs by teacher
  // ==========================================
  prop.app.get(
    `${urlAPI}/teacher/:teacherId`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { teacherId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
          return res.status(400).json({
            success: false,
            message: "ID គ្រូបង្រៀនមិនត្រឹមត្រូវ!",
          });
        }

        const result = await Model.find({
          teacher_id: teacherId,
          deleted: false,
        })
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ created_date: -1 });

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
  // GET BY DATE RANGE - Get attendance logs by date range
  // ==========================================
  prop.app.get(
    `${urlAPI}/date-range`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនកាលបរិច្ឆេទចាប់ផ្តើម និងបញ្ចប់!",
          });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const result = await Model.find({
          schedule_session: {
            $gte: start,
            $lte: end,
          },
          deleted: false,
        })
          .populate("class_id", "name")
          .populate("teacher_id", "firstname lastname")
          .populate("student_id", "firstname lastname")
          .populate("subject_id", "name")
          .populate("created_by", "firstname lastname")
          .populate("updated_by", "firstname lastname")
          .sort({ schedule_session: 1 });

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
  // GET STATISTICS - Get attendance statistics
  // ==========================================
  prop.app.get(
    `${urlAPI}/statistics/:studentId`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            message: "ID សិស្សមិនត្រឹមត្រូវ!",
          });
        }

        // Get all attendance records for this student
        const records = await Model.find({
          student_id: studentId,
          deleted: false,
        });

        // Calculate statistics
        const totalRecords = records.length;
        const present = records.filter(r => r.attendace_status === 'present').length;
        const absent = records.filter(r => r.attendace_status === 'absent').length;
        const late = records.filter(r => r.attendace_status === 'late').length;

        const statistics = {
          total_records: totalRecords,
          present: present,
          absent: absent,
          late: late,
          present_percentage: totalRecords > 0 ? ((present / totalRecords) * 100).toFixed(2) : 0,
          absent_percentage: totalRecords > 0 ? ((absent / totalRecords) * 100).toFixed(2) : 0,
          late_percentage: totalRecords > 0 ? ((late / totalRecords) * 100).toFixed(2) : 0,
        };

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: statistics,
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