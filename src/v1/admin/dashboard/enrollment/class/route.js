const mongoose = require("mongoose");
const Model = require("./model");
const ModelMajor = require("../../subject_and_time/major/model");
const ModelRoom = require("../../building/room/model");
const ModelTimeTable = require("../time_table/model");
const ModelStudentClass = require("../student_in_class/model");
const ModelDegreeLevel = require("../../master_data/degree_level/model");
const ModelShift = require("../../master_data/shift/model");
const ModelYearStudy = require("../../master_data/year_study/model");
const ModelSemester = require("../../master_data/semester/model");
const ModelSubject = require("../../subject_and_time/subject/model");
const ModelDepartment = require("../../subject_and_time/department/model");
const ModelTeacher = require("../../student_mgt/teacher/model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "academic/class";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  async function validateSchedule(schedule) {
    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const validStatuses = ["pending", "start", "closed", "cancelled"];
    const validSubjectStatuses = ["pending", "start", "closed"];

    if (!Array.isArray(schedule)) {
      return { valid: false, message: "សូមបញ្ជូនកាលវិភាគជា Array!" };
    }

    for (const daySchedule of schedule) {
      // Validate day
      if (!daySchedule.day) {
        return { valid: false, message: "សូមបញ្ជូនថ្ងៃ!" };
      }
      if (!validDays.includes(daySchedule.day)) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} មិនត្រឹមត្រូវ!`,
        };
      }

      // Validate subject_id at day level
      if (!daySchedule.subject_id) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} សូមបញ្ជូនលេខសម្គាល់មុខវិជ្ជា!`,
        };
      }

      const subject = await ModelSubject.findOne({
        _id: daySchedule.subject_id,
        deleted: false,
      });
      if (!subject) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} មុខវិជ្ជានេះមិនមានក្នុងប្រព័ន្ធ!`,
        };
      }

      // Validate teacher_id at day level
      if (!daySchedule.teacher_id) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} សូមបញ្ជូនលេខសម្គាល់គ្រូបង្រៀន!`,
        };
      }

      const teacher = await ModelTeacher.findOne({
        _id: daySchedule.teacher_id,
        deleted: false,
      });
      if (!teacher) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} គ្រូបង្រៀននេះមិនមានក្នុងប្រព័ន្ធ!`,
        };
      }

      // Validate room_id at day level
      if (!daySchedule.room_id) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} សូមបញ្ជូនលេខសម្គាល់បន្ទប់!`,
        };
      }

      const room = await ModelRoom.findOne({
        _id: daySchedule.room_id,
        deleted: false,
      });
      if (!room) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} បន្ទប់នេះមិនមានក្នុងប្រព័ន្ធ!`,
        };
      }

      // Validate session_total at day level
      if (!daySchedule.session_total || daySchedule.session_total < 1) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} ចំនួនវគ្គសរុបត្រូវតែធំជាង 0!`,
        };
      }

      // Validate subject_status
      if (
        daySchedule.subject_status &&
        !validSubjectStatuses.includes(daySchedule.subject_status)
      ) {
        return {
          valid: false,
          message: `ថ្ងៃ ${daySchedule.day} ស្ថានភាពមុខវិជ្ជាមិនត្រឹមត្រូវ!`,
        };
      }

      // Validate periods
      if (
        !Array.isArray(daySchedule.periods) ||
        daySchedule.periods.length === 0
      ) {
        return {
          valid: false,
          message: `សូមបញ្ជូនពេលវេលាបង្រៀនសម្រាប់ថ្ងៃ ${daySchedule.day}!`,
        };
      }

      const periodKeyMap = new Map();

      for (const period of daySchedule.periods) {
        // ✅ Validate day inside period
        if (!period.day) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} សូមបញ្ជូនថ្ងៃក្នុងពេលវេលាបង្រៀន!`,
          };
        }
        if (!validDays.includes(period.day)) {
          return { valid: false, message: `ថ្ងៃ ${period.day} មិនត្រឹមត្រូវ!` };
        }

        // Validate period_number
        if (
          !period.period_number ||
          period.period_number < 1 ||
          period.period_number > 20
        ) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} លេខម៉ោងសិក្សាត្រូវតែចន្លោះពី 1 ដល់ 20!`,
          };
        }

        // Check duplicate period_number on same day
        const key = `${daySchedule.day}_${period.period_number}`;
        if (periodKeyMap.has(key)) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} មានម៉ោងសិក្សាលេខ ${period.period_number} ដដែលៗ!`,
          };
        }
        periodKeyMap.set(key, true);

        // Validate session_number
        if (!period.session_number || period.session_number < 1) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} លេខវគ្គត្រូវតែចាប់ផ្តើមពី 1!`,
          };
        }

        // Validate time
        if (!period.time_from || !period.time_to) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} សូមបំពេញពេលចាប់ផ្តើម និងបញ្ចប់!`,
          };
        }

        // Validate status
        if (period.status && !validStatuses.includes(period.status)) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} ស្ថានភាពមិនត្រឹមត្រូវ!`,
          };
        }

        // Check if session_number exceeds session_total
        if (period.session_number > daySchedule.session_total) {
          return {
            valid: false,
            message: `ថ្ងៃ ${daySchedule.day} លេខវគ្គ ${period.session_number} ធំជាងចំនួនវគ្គសរុប ${daySchedule.session_total}!`,
          };
        }
      }
    }

    // Check teacher conflicts
    const teacherScheduleMap = new Map();
    for (const daySchedule of schedule) {
      for (const period of daySchedule.periods) {
        const key = `${daySchedule.teacher_id.toString()}_${period.day}_${period.period_number}`;
        if (teacherScheduleMap.has(key)) {
          return {
            valid: false,
            message: `គ្រូបង្រៀននេះមានម៉ោងបង្រៀននៅថ្ងៃ ${period.day} ម៉ោង ${period.period_number} រួចហើយ!`,
          };
        }
        teacherScheduleMap.set(key, true);
      }
    }

    // Check room conflicts
    const roomScheduleMap = new Map();
    for (const daySchedule of schedule) {
      for (const period of daySchedule.periods) {
        const key = `${daySchedule.room_id.toString()}_${period.day}_${period.period_number}`;
        if (roomScheduleMap.has(key)) {
          return {
            valid: false,
            message: `បន្ទប់នេះមានការប្រើប្រាស់នៅថ្ងៃ ${period.day} ម៉ោង ${period.period_number} រួចហើយ!`,
          };
        }
        roomScheduleMap.set(key, true);
      }
    }

    return { valid: true };
  }
  // ==========================================
  // CREATE
  // ==========================================
  prop.app.post(
    `${urlAPI}`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const requiredFields = [
          { key: "code", label: "កូដថ្នាក់" },
          { key: "batch", label: "ជំនាន់" },
          { key: "year_study_from", label: "ឆ្នាំសិក្សាចាប់ផ្ដើម" },
          { key: "year_study_to", label: "ឆ្នាំសិក្សាបញ្ចប់" },
          { key: "shift_id", label: "វេនសិក្សា" },
          { key: "major_id", label: "ជំនាញ" },
          { key: "year_study_id", label: "ឆ្នាំសិក្សា" },
          { key: "room_id", label: "បន្ទប់" },
          { key: "semester_id", label: "ឆមាស" },
          { key: "degree_level_id", label: "កម្រិតសញ្ញាបត្រ" },
        ];
        checkValidtion(res, req, requiredFields);

        const { user_id: userId, user_data: user_data } = req.session;

        const {
          code,
          batch,
          group_number,
          year_study_from,
          year_study_to,
          shift_id,
          major_id,
          year_study_id,
          room_id,
          semester_id,
          degree_level_id,
          class_status,
          schedule,
          students,
          note,
          status,
        } = req.body;

        // Validation checks...
        const major = await ModelMajor.findOne({
          _id: major_id,
          deleted: false,
        });
        if (!major)
          return res
            .status(404)
            .json({ success: false, message: "ជំនាញនេះមិនមានក្នុងប្រព័ន្ធ!" });

        const room = await ModelRoom.findOne({ _id: room_id, deleted: false });
        if (!room)
          return res
            .status(404)
            .json({ success: false, message: "បន្ទប់នេះមិនមានក្នុងប្រព័ន្ធ!" });

        const degreeLevel = await ModelDegreeLevel.findOne({
          _id: degree_level_id,
          deleted: false,
        });
        if (!degreeLevel)
          return res.status(404).json({
            success: false,
            message: "កម្រិតសញ្ញាបត្រនេះមិនមានក្នុងប្រព័ន្ធ!",
          });

        const shift = await ModelShift.findOne({
          _id: shift_id,
          deleted: false,
        });
        if (!shift)
          return res.status(404).json({
            success: false,
            message: "វេនសិក្សានេះមិនមានក្នុងប្រព័ន្ធ!",
          });

        const yearStudy = await ModelYearStudy.findOne({
          _id: year_study_id,
          deleted: false,
        });
        if (!yearStudy)
          return res.status(404).json({
            success: false,
            message: "ឆ្នាំសិក្សានេះមិនមានក្នុងប្រព័ន្ធ!",
          });

        const semester = await ModelSemester.findOne({
          _id: semester_id,
          deleted: false,
        });
        if (!semester)
          return res
            .status(404)
            .json({ success: false, message: "ឆមាសនេះមិនមានក្នុងប្រព័ន្ធ!" });

        const existingClass = await Model.findOne({
          code: code.trim(),
          deleted: false,
        });
        if (existingClass) {
          return res.status(400).json({
            success: false,
            message: "កូដថ្នាក់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
          });
        }

        let processedSchedule = [];
        if (schedule && Array.isArray(schedule) && schedule.length > 0) {
          const validation = await validateSchedule(schedule);
          if (!validation.valid) {
            return res
              .status(400)
              .json({ success: false, message: validation.message });
          }
          processedSchedule = schedule;
        }

        let processedStudents = [];
        if (students && Array.isArray(students) && students.length > 0) {
          for (const student of students) {
            const studentScores = processedSchedule.map((subject) => ({
              subject_id: subject.subject_id,
              score_detail: {
                score_1: 0,
                score_2: 0,
                score_3: 0,
                score_4: 0,
                score_5: 0,
                midterm: 0,
                final: 0,
                total: 0,
                grade: "",
              },
            }));
            const studentAttendance = processedSchedule.map((subject) => ({
              subject_id: subject.subject_id,
              total_absence_unreport: 0,
              total_absence_report: 0,
            }));
            processedStudents.push({
              student_id: student.student_id,
              attendance: studentAttendance,
              score: studentScores,
            });
          }
        }

        const saveData = await Model.create({
          code: code.trim(),
          batch: batch,
          group_number: group_number || "",
          year_study_from: year_study_from,
          year_study_to: year_study_to,
          shift_id: shift_id,
          major_id: major_id,
          year_study_id: year_study_id,
          room_id: room_id,
          semester_id: semester_id,
          degree_level_id: degree_level_id,
          class_status: class_status || "start",
          schedule: processedSchedule,
          students: processedStudents,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        const populatedData = await Model.findById(saveData._id)
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

        await logActivity({
          title: `ថ្នាក់ថ្មី: ${code} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: populatedData,
          message: `ថ្នាក់ថ្មី: ${code} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating class:", error);
        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កូដថ្នាក់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            error: error.message,
          });
        }
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការបង្កើតថ្នាក់! សូមព្យាយាមម្តងទៀត",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // UPDATE
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
          code,
          batch,
          group_number,
          year_study_from,
          year_study_to,
          shift_id,
          major_id,
          year_study_id,
          room_id,
          semester_id,
          degree_level_id,
          class_status,
          schedule,
          students,
          note,
          status,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ" });
        }

        const existingClass = await Model.findOne({ _id: id, deleted: false });
        if (!existingClass) {
          return res
            .status(404)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!" });
        }

        const updateFields = { updated_by: userId };

        if (code !== undefined && code !== null) {
          const duplicateClass = await Model.findOne({
            code: code.trim(),
            deleted: false,
            _id: { $ne: id },
          });
          if (duplicateClass) {
            return res.status(400).json({
              success: false,
              message: "កូដថ្នាក់នេះមានរួចហើយក្នុងប្រព័ន្ធ!",
            });
          }
          updateFields.code = code.trim();
        }

        if (batch !== undefined && batch !== null) updateFields.batch = batch;
        if (group_number !== undefined && group_number !== null)
          updateFields.group_number = group_number;
        if (year_study_from !== undefined && year_study_from !== null)
          updateFields.year_study_from = year_study_from;
        if (year_study_to !== undefined && year_study_to !== null)
          updateFields.year_study_to = year_study_to;
        if (shift_id !== undefined && shift_id !== null)
          updateFields.shift_id = shift_id;
        if (major_id !== undefined && major_id !== null)
          updateFields.major_id = major_id;
        if (year_study_id !== undefined && year_study_id !== null)
          updateFields.year_study_id = year_study_id;
        if (room_id !== undefined && room_id !== null)
          updateFields.room_id = room_id;
        if (semester_id !== undefined && semester_id !== null)
          updateFields.semester_id = semester_id;
        if (degree_level_id !== undefined && degree_level_id !== null)
          updateFields.degree_level_id = degree_level_id;
        if (class_status !== undefined && class_status !== null)
          updateFields.class_status = class_status;

        if (schedule !== undefined && schedule !== null) {
          if (Array.isArray(schedule) && schedule.length > 0) {
            const validation = await validateSchedule(schedule);
            if (!validation.valid) {
              return res
                .status(400)
                .json({ success: false, message: validation.message });
            }
            updateFields.schedule = schedule;
          } else {
            updateFields.schedule = [];
          }
        }

        if (students !== undefined && students !== null)
          updateFields.students = students;
        if (note !== undefined && note !== null) updateFields.note = note;
        if (status !== undefined && status !== null)
          updateFields.status = status;

        if (Object.keys(updateFields).length === 1) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនទិន្នន័យដែលត្រូវកែប្រែ!",
          });
        }

        const updatedData = await Model.findByIdAndUpdate(id, updateFields, {
          new: true,
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

        await logActivity({
          title: `ថ្នាក់: ${updatedData.code} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "ថ្នាក់ត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating class:", error);
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែថ្នាក់!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // GET BY ID
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
            return res
              .status(400)
              .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ" });
          }
          var data = await Model.findOne({ _id: id, deleted: false }).populate([
            { path: "major_id" },
            { path: "room_id" },
            { path: "degree_level_id" },
            { path: "shift_id" },
            { path: "year_study_id" },
            { path: "semester_id" },
            { path: "schedule.subject_id" },
            { path: "schedule.teacher_id" },
            {
              path: "schedule.room_id",
              populate: {
                path: "floor_id",
                populate: {
                  path: "building_id",
                },
              },
            },
            { path: "schedule.score_option_id" },
            { path: "students.student_id" },
            { path: "students.score.subject_id" },
          ]);

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
  // GET ALL
  // ==========================================
  prop.app.get(
    `${urlAPI}-all`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({ deleted: false })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");
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
  // SOFT DELETE
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ" });
        }

        const classData = await Model.findOne({ _id: id, deleted: false });
        if (!classData) {
          return res
            .status(404)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!" });
        }

        const updatedClass = await Model.findByIdAndUpdate(
          id,
          {
            deleted: true,
            deleted_at: new Date(),
            deleted_by: userId,
            updated_by: userId,
          },
          { new: true },
        );

        await logActivity({
          title: `${classData.code} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedClass,
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
  // RESTORE
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ" });
        }

        const classData = await Model.findOne({ _id: id, deleted: true });
        if (!classData) {
          return res
            .status(404)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!" });
        }

        const restoredClass = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        )
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

        await logActivity({
          title: `${classData.code} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${user_data.firstname + " " + user_data.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredClass,
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
  // DELETE FOREVER
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ" });
        }

        const classData = await Model.findOne({ _id: id });
        if (!classData) {
          return res
            .status(404)
            .json({ success: false, message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!" });
        }

        const className = classData.code;
        await Model.findByIdAndDelete(id);

        await logActivity({
          title: `${className} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
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
  // GET TRASH
  // ==========================================
  prop.app.get(
    `${urlAPI}-trash`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({ deleted: true })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");
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
        const populatedData = await Model.populate(result.data, [
          { path: "major_id" },
          { path: "room_id" },
          { path: "degree_level_id" },
          { path: "shift_id" },
          { path: "year_study_id" },
          { path: "semester_id" },
        ]);
        const newData = populatedData.map((row) => row.toObject());
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

  // ==========================================
  // GET - Pagination with info
  // ==========================================
  prop.app.get(
    `${urlAPI}-with-info`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        const result = await getFilteredMongoDB(req.query, Model, [], [], null);
        const populatedData = await Model.populate(result.data, [
          { path: "major_id" },
          { path: "room_id" },
          { path: "degree_level_id" },
          { path: "shift_id" },
          { path: "year_study_id" },
          { path: "semester_id" },
          { path: "schedule.subject_id" },
          { path: "schedule.teacher_id" },
          { path: "schedule.room_id" },
          { path: "schedule.score_option_id" },
          { path: "students.student_id" },
          { path: "students.score.subject_id" },
        ]);
        const newData = populatedData.map((row) => row.toObject());
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

  // ==========================================
  // GET CLASSES BY MAJOR
  // ==========================================
  prop.app.get(
    `${urlAPI}/major/:major_id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { major_id } = req.params;
        if (!major_id || !mongoose.Types.ObjectId.isValid(major_id)) {
          return res
            .status(400)
            .json({ success: false, message: "លេខសម្គាល់ជំនាញមិនត្រឹមត្រូវ!" });
        }
        const major = await ModelMajor.findOne({
          _id: major_id,
          deleted: false,
        });
        if (!major) {
          return res
            .status(404)
            .json({ success: false, message: "ជំនាញនេះមិនមានក្នុងប្រព័ន្ធ!" });
        }
        const classes = await Model.find({ major_id: major_id, deleted: false })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id")
          .sort({ code: 1 });
        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: { major: major, classes: classes, class_count: classes.length },
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
  // GET CLASSES BY MAJOR - Get all classes by major_id
  // ==========================================
  prop.app.get(
    `${urlAPI}/major/:major_id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { major_id } = req.params;

        if (!major_id || !mongoose.Types.ObjectId.isValid(major_id)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់ជំនាញមិនត្រឹមត្រូវ!",
          });
        }

        const major = await ModelMajor.findOne({
          _id: major_id,
          deleted: false,
        });

        if (!major) {
          return res.status(404).json({
            success: false,
            message: "ជំនាញនេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        const classes = await Model.find({
          major_id: major_id,
          deleted: false,
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id")
          .sort({ code: 1 });

        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            major: major,
            classes: classes,
            class_count: classes.length,
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
  // GET CLASSES BY ROOM - Get all classes by room_id
  // ==========================================
  prop.app.get(
    `${urlAPI}/room/:room_id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { room_id } = req.params;

        if (!room_id || !mongoose.Types.ObjectId.isValid(room_id)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់បន្ទប់មិនត្រឹមត្រូវ!",
          });
        }

        const room = await ModelRoom.findOne({
          _id: room_id,
          deleted: false,
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: "បន្ទប់នេះមិនមានក្នុងប្រព័ន្ធ!",
          });
        }

        const classes = await Model.find({
          room_id: room_id,
          deleted: false,
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id")
          .sort({ code: 1 });

        return res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: {
            room: room,
            classes: classes,
            class_count: classes.length,
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
  // GET BY ID - Get single class with timetable and all students
  // ==========================================
  prop.app.get(
    `${urlAPI}-time-table-and-student/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        var data = await Model.findOne({
          _id: id,
          deleted: false,
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        const classData = data.toObject();

        const timeTable = await ModelTimeTable.findOne({
          class_id: id,
          deleted: false,
        })
          .populate({
            path: "schedule.periods.subject_id",
            model: "Subject",
          })
          .populate({
            path: "schedule.periods.teacher_id",
            model: "Teacher",
          })
          .populate({
            path: "schedule.periods.room_id",
            model: "Room",
            populate: {
              path: "floor_id",
              model: "Floor",
              populate: {
                path: "building_id",
                model: "Building",
              },
            },
          });

        classData.time_table = timeTable || null;

        // Get students from ModelStudentClass if needed (or use embedded students)
        const students = await ModelStudentClass.find({
          class_id: id,
          deleted: false,
        })
          .populate("student_id")
          .populate("scores.subject_id")
          .sort({ created_date: -1 });

        classData.students_from_relation = students || [];
        classData.total_students = students ? students.length : 0;

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: classData });
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
  // GET ALL - Get all Filter by class_status (with pagination & search)
  // ==========================================
  prop.app.get(
    `${urlAPI}-filter-all`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        const result = await getFilteredMongoDB(req.query, Model, [], [], null);

        const populatedData = await Model.populate(result.data, [
          { path: "major_id" },
          { path: "room_id" },
          { path: "degree_level_id" },
          { path: "shift_id" },
          { path: "year_study_id" },
          { path: "semester_id" },
          { path: "schedule.subject_id" },
          { path: "schedule.teacher_id" },
          { path: "schedule.room_id" },
          { path: "schedule.score_option_id" },
          { path: "students.student_id" },
          { path: "students.score.subject_id" },
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

  // ==========================================
  // APP - Get classes with status 'start'
  // ==========================================
  prop.app.get(
    `${urlAPI}-app/start`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({
          deleted: false,
          class_status: "start",
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

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
  // APP - Get classes with status 'pending'
  // ==========================================
  prop.app.get(
    `${urlAPI}-app/pending`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const result = await Model.find({
          deleted: false,
          class_status: "pending",
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

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
  // APP - Get all classes with pagination
  // ==========================================
  prop.app.get(
    `${urlAPI}-app`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { user_id: userId } = req.session;
        const result = await getFilteredMongoDB(req.query, Model, [], [], null);

        const populatedData = await Model.populate(result.data, [
          { path: "major_id" },
          { path: "room_id" },
          { path: "degree_level_id" },
          { path: "shift_id" },
          { path: "year_study_id" },
          { path: "semester_id" },
          { path: "schedule.subject_id" },
          { path: "schedule.teacher_id" },
          { path: "schedule.room_id" },
          { path: "schedule.score_option_id" },
          { path: "students.student_id" },
          { path: "students.score.subject_id" },
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

  // ==========================================
  // UPDATE SCHEDULE - Update only schedule of a class
  // ==========================================
  prop.app.put(
    `${urlAPI}/schedule/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: user_data } = req.session;
        const { schedule } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if class exists
        const existingClass = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingClass) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Validate schedule
        if (!Array.isArray(schedule)) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនកាលវិភាគជា Array!",
          });
        }

        const validation = await validateSchedule(schedule);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
          });
        }

        // Update only schedule
        const updatedData = await Model.findByIdAndUpdate(
          id,
          {
            schedule: schedule,
            updated_by: userId,
          },
          { new: true },
        )
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate("schedule.subject_id")
          .populate("schedule.teacher_id")
          .populate("schedule.room_id")
          .populate("schedule.score_option_id")
          .populate("students.student_id")
          .populate("students.score.subject_id");

        // Log
        await logActivity({
          title: `កាលវិភាគថ្នាក់: ${updatedData.code} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${user_data.firstname + " " + user_data.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "កាលវិភាគថ្នាក់ត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating schedule:", error);
        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែកាលវិភាគ!",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET CLASSES BY STUDENT ID - Get all classes by student_id
  // ==========================================
  prop.app.get(
    `${urlAPI}-get-all-class-by-id-user/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id: studentId } = req.params;

        // Validate student ID
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់និស្សិតមិនត្រឹមត្រូវ!",
          });
        }

        // Find all classes that contain this student in their students array
        const classes = await Model.find({
          deleted: false,
          "students.student_id": studentId,
        })
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate({
            path: "schedule.subject_id",
            model: "Subject",
          })
          .populate({
            path: "schedule.teacher_id",
            model: "Teacher",
          })
          .populate({
            path: "schedule.room_id",
            model: "Room",
            populate: {
              path: "floor_id",
              model: "Floor",
              populate: {
                path: "building_id",
                model: "Building",
              },
            },
          })
          .populate("schedule.score_option_id")
          .populate({
            path: "students.student_id",
            model: "Student",
          })
          .populate("students.score.subject_id")
          .sort({ created_date: -1 });

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          count: classes.length,
          data: classes,
        });
      } catch (err) {
        console.error("❌ Error fetching classes by student ID:", err);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET CLASSES BY TEACHER ID - Get all classes by teacher_id with pagination and status filter
  // ==========================================
  prop.app.get(
    `${urlAPI}-get-all-class-by-id-teacher/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id: teacherId } = req.params;

        // Pagination parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Status filter
        const status = req.query.status || "all";

        // Validate teacher ID
        if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
          return res.status(400).json({
            success: false,
            message: "លេខសម្គាល់គ្រូបង្រៀនមិនត្រឹមត្រូវ!",
          });
        }

        // Convert to ObjectId for proper comparison
        const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

        // Build query
        const query = {
          deleted: false,
          $or: [
            { "schedule.teacher_id": teacherId },
            { "schedule.teacher_id": teacherObjectId },
          ],
        };

        // Add status filter if not 'all'
        if (status && status !== "all") {
          query.class_status = status;
        }

        // Get total count for pagination
        const totalCount = await Model.countDocuments(query);

        // Find all classes that have this teacher in their schedule with pagination
        const classes = await Model.find(query)
          .populate("major_id")
          .populate("room_id")
          .populate("degree_level_id")
          .populate("shift_id")
          .populate("year_study_id")
          .populate("semester_id")
          .populate({
            path: "schedule.subject_id",
            model: "Subject",
          })
          .populate({
            path: "schedule.teacher_id",
            model: "Teacher",
          })
          .populate({
            path: "schedule.room_id",
            model: "Room",
            populate: {
              path: "floor_id",
              model: "Floor",
              populate: {
                path: "building_id",
                model: "Building",
              },
            },
          })
          .populate("schedule.score_option_id")
          .populate({
            path: "students.student_id",
            model: "Student",
          })
          .populate("students.score.subject_id")
          .sort({ created_date: -1 })
          .skip(skip)
          .limit(limit);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
          success: true,
          message: "ជោគជ័យ",
          data: classes,
          pagination: {
            total: totalCount,
            page: page,
            limit: limit,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage,
            nextPage: hasNextPage ? page + 1 : null,
            prevPage: hasPrevPage ? page - 1 : null,
          },
        });
      } catch (err) {
        console.error("❌ Error fetching classes by teacher ID:", err);
        res.status(500).json({
          success: false,
          message: "Server error",
          error: err.message || err,
        });
      }
    },
  );

  // ==========================================
  // GET CLASSES Stard
  // ==========================================

prop.app.get(
  `${urlAPI}-get-all-started-only`,
  prop.api_auth,
  prop.jwt_auth,
  prop.request_user,
  async (req, res) => {
    try {
      const getStartedClassData = await Model.find({ class_status: "start" })
        .populate("major_id")
        .populate({
          path: "major_id",
          populate: {
            path: "department_id",
            model: "Department",
          },
        })
        .populate("degree_level_id")
        .populate("shift_id")
        .populate("year_study_id")
        .populate("semester_id")
        .populate({
          path: "schedule.subject_id",
          model: "Subject",
        })
        .populate({
          path: "schedule.teacher_id",
          model: "Teacher",
        })
        .populate({
          path: "schedule.room_id",
          model: "Room",
          populate: {
            path: "floor_id",
            model: "Floor",
            populate: {
              path: "building_id",
              model: "Building",
            },
          },
        })
        .populate("schedule.score_option_id")
        .populate({
          path: "students.student_id",
          model: "Student",
        })
        .populate("students.score.subject_id");

      // Collect all unique teachers with their subjects and classes
      const allTeachersMap = new Map();

      // Group classes by shift using reduce
      const shifts = getStartedClassData.reduce((acc, cls) => {
        const shiftId = cls.shift_id?._id?.toString() || "unknown";
        const existingShift = acc.find((item) => item.shift._id === shiftId);

        // Collect teachers from this class with their subjects
        const classTeacherSubjects = new Map();

        cls.schedule?.forEach(scheduleItem => {
          if (scheduleItem.teacher_id?._id) {
            const teacherId = scheduleItem.teacher_id._id.toString();
            const subjectId = scheduleItem.subject_id?._id?.toString();
            const classId = cls._id.toString();
            
            if (!classTeacherSubjects.has(teacherId)) {
              classTeacherSubjects.set(teacherId, new Set());
            }
            if (subjectId) {
              classTeacherSubjects.get(teacherId).add(subjectId);
            }
            
            if (!allTeachersMap.has(teacherId)) {
              const teacher = scheduleItem.teacher_id;
              allTeachersMap.set(teacherId, {
                _id: teacher._id,
                info_firstname_en: teacher.info_firstname_en || '',
                info_lastname_en: teacher.info_lastname_en || '',
                info_firstname_kh: teacher.info_firstname_kh || '',
                info_lastname_kh: teacher.info_lastname_kh || '',
                info_teacher_uef_id: teacher.info_teacher_uef_id || '',
                info_email: teacher.info_email || '',
                info_phone_number: teacher.info_phone_number || '',
                fullName_en: teacher.fullName_en || `${teacher.info_firstname_en || ''} ${teacher.info_lastname_en || ''}`.trim() || 'N/A',
                fullName_kh: teacher.fullName_kh || `${teacher.info_firstname_kh || ''} ${teacher.info_lastname_kh || ''}`.trim() || 'N/A',
                subjects: new Map(),
                classes: new Map(),
              });
            }
            
            if (subjectId && scheduleItem.subject_id) {
              const teacherData = allTeachersMap.get(teacherId);
              if (!teacherData.subjects.has(subjectId)) {
                teacherData.subjects.set(subjectId, {
                  _id: subjectId,
                  name: scheduleItem.subject_id.name || '',
                  code: scheduleItem.subject_id.code || '',
                });
              }
            }

            if (classId) {
              const teacherData = allTeachersMap.get(teacherId);
              if (!teacherData.classes.has(classId)) {
                const majorData = cls.major_id || null;
                const departmentData = majorData?.department_id || null;
                
                teacherData.classes.set(classId, {
                  _id: cls._id,
                  code: cls.code || '',
                  batch: cls.batch || '',
                  group_number: cls.group_number || '',
                  class_status: cls.class_status || '',
                  major_id: majorData ? {
                    _id: majorData._id,
                    name: majorData.name || '',
                    name_in_english: majorData.name_in_english || '',
                    note: majorData.note || '',
                    status: majorData.status,
                    deleted: majorData.deleted,
                    created_by: majorData.created_by,
                    updated_by: majorData.updated_by,
                    created_date: majorData.created_date,
                    updated_date: majorData.updated_date,
                    department_id: departmentData ? {
                      _id: departmentData._id,
                      name: departmentData.name || '',
                      name_in_engish: departmentData.name_in_engish || '',
                      note: departmentData.note || '',
                      status: departmentData.status,
                      deleted: departmentData.deleted,
                      created_by: departmentData.created_by,
                      updated_by: departmentData.updated_by,
                      created_date: departmentData.created_date,
                      updated_date: departmentData.updated_date,
                    } : null,
                  } : null,
                  degree_level_id: cls.degree_level_id || null,
                  shift_id: cls.shift_id || null,
                  year_study_id: cls.year_study_id || null,
                  semester_id: cls.semester_id || null,
                  year_study_from: cls.year_study_from || null,
                  year_study_to: cls.year_study_to || null,
                  students: cls.students || [],
                  schedule: cls.schedule || [],
                });
              }
            }
          }
        });

        if (existingShift) {
          existingShift.classes.push(cls);
          existingShift.total_classes = existingShift.classes.length;
          
          classTeacherSubjects.forEach((subjects, teacherId) => {
            if (!existingShift.teacherSubjects) {
              existingShift.teacherSubjects = new Map();
            }
            
            if (!existingShift.teacherSubjects.has(teacherId)) {
              existingShift.teacherSubjects.set(teacherId, new Set());
            }
            subjects.forEach(subjectId => {
              existingShift.teacherSubjects.get(teacherId).add(subjectId);
            });
          });
          
          existingShift.total_teachers = existingShift.teacherSubjects.size;
          
        } else {
          const shiftTeacherSubjects = new Map();
          classTeacherSubjects.forEach((subjects, teacherId) => {
            shiftTeacherSubjects.set(teacherId, subjects);
          });
          
          acc.push({
            shift: {
              _id: shiftId,
              name: cls.shift_id?.name || "មិនមានវេន",
              name_in_eng: cls.shift_id?.name_in_eng || "No Shift",
              note: cls.shift_id?.note || "",
              status: cls.shift_id?.status ?? true,
              deleted: cls.shift_id?.deleted ?? false,
              created_by: cls.shift_id?.created_by || null,
              updated_by: cls.shift_id?.updated_by || null,
              created_date: cls.shift_id?.created_date || null,
              updated_date: cls.shift_id?.updated_date || null,
            },
            total_classes: 1,
            total_teachers: classTeacherSubjects.size,
            teacherSubjects: shiftTeacherSubjects,
            classes: [cls],
          });
        }
        return acc;
      }, []);

      // Group classes by department
      const departmentMap = new Map();
      
      getStartedClassData.forEach(cls => {
        const department = cls.major_id?.department_id || null;
        if (department) {
          const deptId = department._id.toString();
          if (!departmentMap.has(deptId)) {
            departmentMap.set(deptId, {
              department: {
                _id: department._id,
                name: department.name || '',
                name_in_engish: department.name_in_engish || '',
                note: department.note || '',
                status: department.status,
                deleted: department.deleted,
                created_by: department.created_by,
                updated_by: department.updated_by,
                created_date: department.created_date,
                updated_date: department.updated_date,
              },
              classes: [],
              total_classes: 0,
              shifts: new Set(),
              teachers: new Set(),
              majors: new Set(),
            });
          }
          departmentMap.get(deptId).classes.push(cls);
          departmentMap.get(deptId).total_classes = departmentMap.get(deptId).classes.length;
          
          if (cls.major_id?._id) {
            departmentMap.get(deptId).majors.add(cls.major_id._id.toString());
          }
          
          if (cls.shift_id?._id) {
            departmentMap.get(deptId).shifts.add(cls.shift_id._id.toString());
          }
          
          cls.schedule?.forEach(scheduleItem => {
            if (scheduleItem.teacher_id?._id) {
              departmentMap.get(deptId).teachers.add(scheduleItem.teacher_id._id.toString());
            }
          });
        }
      });

      // Group classes by degree level
      const degreeLevelMap = new Map();
      
      getStartedClassData.forEach(cls => {
        const degreeLevel = cls.degree_level_id || null;
        if (degreeLevel) {
          const degreeId = degreeLevel._id.toString();
          if (!degreeLevelMap.has(degreeId)) {
            degreeLevelMap.set(degreeId, {
              degree_level: {
                _id: degreeLevel._id,
                name: degreeLevel.name || '',
                name_in_eng: degreeLevel.name_in_eng || '',
                code: degreeLevel.code || '',
                note: degreeLevel.note || '',
                status: degreeLevel.status,
                deleted: degreeLevel.deleted,
                created_by: degreeLevel.created_by,
                updated_by: degreeLevel.updated_by,
                created_date: degreeLevel.created_date,
                updated_date: degreeLevel.updated_date,
              },
              classes: [],
              total_classes: 0,
              shifts: new Set(),
              teachers: new Set(),
              departments: new Set(),
              majors: new Set(),
            });
          }
          degreeLevelMap.get(degreeId).classes.push(cls);
          degreeLevelMap.get(degreeId).total_classes = degreeLevelMap.get(degreeId).classes.length;
          
          if (cls.major_id?._id) {
            degreeLevelMap.get(degreeId).majors.add(cls.major_id._id.toString());
          }
          
          if (cls.major_id?.department_id?._id) {
            degreeLevelMap.get(degreeId).departments.add(cls.major_id.department_id._id.toString());
          }
          
          if (cls.shift_id?._id) {
            degreeLevelMap.get(degreeId).shifts.add(cls.shift_id._id.toString());
          }
          
          cls.schedule?.forEach(scheduleItem => {
            if (scheduleItem.teacher_id?._id) {
              degreeLevelMap.get(degreeId).teachers.add(scheduleItem.teacher_id._id.toString());
            }
          });
        }
      });

      // Group classes by major
      const majorMap = new Map();
      
      getStartedClassData.forEach(cls => {
        const major = cls.major_id || null;
        if (major) {
          const majorId = major._id.toString();
          if (!majorMap.has(majorId)) {
            majorMap.set(majorId, {
              major: {
                _id: major._id,
                name: major.name || '',
                name_in_english: major.name_in_english || '',
                note: major.note || '',
                status: major.status,
                deleted: major.deleted,
                created_by: major.created_by,
                updated_by: major.updated_by,
                created_date: major.created_date,
                updated_date: major.updated_date,
                department_id: major.department_id || null,
              },
              classes: [],
              total_classes: 0,
              shifts: new Set(),
              teachers: new Set(),
              degree_levels: new Set(),
            });
          }
          majorMap.get(majorId).classes.push(cls);
          majorMap.get(majorId).total_classes = majorMap.get(majorId).classes.length;
          
          if (cls.degree_level_id?._id) {
            majorMap.get(majorId).degree_levels.add(cls.degree_level_id._id.toString());
          }
          
          if (cls.shift_id?._id) {
            majorMap.get(majorId).shifts.add(cls.shift_id._id.toString());
          }
          
          cls.schedule?.forEach(scheduleItem => {
            if (scheduleItem.teacher_id?._id) {
              majorMap.get(majorId).teachers.add(scheduleItem.teacher_id._id.toString());
            }
          });
        }
      });

      // ============================================
      // NEW: Group classes by room
      // ============================================
      const roomMap = new Map();

      getStartedClassData.forEach(cls => {
        cls.schedule?.forEach(scheduleItem => {
          const room = scheduleItem.room_id || null;
          if (room) {
            const roomId = room._id.toString();
            if (!roomMap.has(roomId)) {
              // Get floor and building details
              const floorData = room.floor_id || null;
              const buildingData = floorData?.building_id || null;
              
              roomMap.set(roomId, {
                room: {
                  _id: room._id,
                  name: room.name || '',
                  floor: floorData ? {
                    _id: floorData._id,
                    name: floorData.name || '',
                    building: buildingData ? {
                      _id: buildingData._id,
                      name: buildingData.name || '',
                      note: buildingData.note || '',
                      status: buildingData.status,
                      deleted: buildingData.deleted,
                    } : null,
                  } : null,
                  note: room.note || '',
                  status: room.status,
                  deleted: room.deleted,
                },
                classes: [],
                total_classes: 0,
                teachers: new Set(),
                subjects: new Set(),
                departments: new Set(),
                majors: new Set(),
                shifts: new Set(),
                degree_levels: new Set(),
              });
            }
            
            const roomData = roomMap.get(roomId);
            // Only add unique classes (prevent duplicates)
            const classExists = roomData.classes.some(c => c._id.toString() === cls._id.toString());
            if (!classExists) {
              roomData.classes.push(cls);
              roomData.total_classes = roomData.classes.length;
            }
            
            // Collect unique teachers for this room
            if (scheduleItem.teacher_id?._id) {
              roomData.teachers.add(scheduleItem.teacher_id._id.toString());
            }
            
            // Collect unique subjects for this room
            if (scheduleItem.subject_id?._id) {
              roomData.subjects.add(scheduleItem.subject_id._id.toString());
            }
            
            // Collect departments
            if (cls.major_id?.department_id?._id) {
              roomData.departments.add(cls.major_id.department_id._id.toString());
            }
            
            // Collect majors
            if (cls.major_id?._id) {
              roomData.majors.add(cls.major_id._id.toString());
            }
            
            // Collect shifts
            if (cls.shift_id?._id) {
              roomData.shifts.add(cls.shift_id._id.toString());
            }
            
            // Collect degree levels
            if (cls.degree_level_id?._id) {
              roomData.degree_levels.add(cls.degree_level_id._id.toString());
            }
          }
        });
      });

      // Convert room map to array with full details
      const rooms = Array.from(roomMap.values()).map(roomData => {
        // Collect subjects with full details for this room
        const roomSubjects = [];
        const subjectIds = new Set();
        
        roomData.classes.forEach(cls => {
          cls.schedule?.forEach(scheduleItem => {
            if (scheduleItem.subject_id && scheduleItem.subject_id._id) {
              const subjectId = scheduleItem.subject_id._id.toString();
              if (!subjectIds.has(subjectId)) {
                subjectIds.add(subjectId);
                roomSubjects.push({
                  _id: scheduleItem.subject_id._id,
                  name: scheduleItem.subject_id.name || '',
                  code: scheduleItem.subject_id.code || '',
                });
              }
            }
          });
        });
        
        // Collect teachers with full details for this room
        const roomTeachers = [];
        const teacherIds = new Set();
        
        roomData.classes.forEach(cls => {
          cls.schedule?.forEach(scheduleItem => {
            if (scheduleItem.teacher_id && scheduleItem.teacher_id._id) {
              const teacherId = scheduleItem.teacher_id._id.toString();
              if (!teacherIds.has(teacherId)) {
                teacherIds.add(teacherId);
                roomTeachers.push({
                  _id: scheduleItem.teacher_id._id,
                  fullName_en: scheduleItem.teacher_id.fullName_en || 
                    `${scheduleItem.teacher_id.info_firstname_en || ''} ${scheduleItem.teacher_id.info_lastname_en || ''}`.trim() || 'N/A',
                  fullName_kh: scheduleItem.teacher_id.fullName_kh || 
                    `${scheduleItem.teacher_id.info_firstname_kh || ''} ${scheduleItem.teacher_id.info_lastname_kh || ''}`.trim() || 'N/A',
                  info_email: scheduleItem.teacher_id.info_email || '',
                  info_phone_number: scheduleItem.teacher_id.info_phone_number || '',
                });
              }
            }
          });
        });
        
        return {
          room: roomData.room,
          total_classes: roomData.total_classes,
          total_teachers: roomData.teachers.size,
          total_subjects: roomData.subjects.size,
          total_departments: roomData.departments.size,
          total_majors: roomData.majors.size,
          total_shifts: roomData.shifts.size,
          total_degree_levels: roomData.degree_levels.size,
          teachers: roomTeachers,
          subjects: roomSubjects,
          classes: roomData.classes,
        };
      });

      // Sort rooms by name
      rooms.sort((a, b) => {
        const nameA = a.room.name || '';
        const nameB = b.room.name || '';
        return nameA.localeCompare(nameB);
      });

      // ============================================
      // END OF ROOM GROUPING
      // ============================================

      // Convert department map to array
      const departments = Array.from(departmentMap.values()).map(dept => ({
        department: dept.department,
        total_classes: dept.total_classes,
        total_shifts: dept.shifts.size,
        total_teachers: dept.teachers.size,
        total_majors: dept.majors.size,
        classes: dept.classes,
      }));

      // Sort departments by name
      departments.sort((a, b) => {
        const nameA = a.department.name || '';
        const nameB = b.department.name || '';
        return nameA.localeCompare(nameB);
      });

      // Convert degree level map to array
      const degreeLevels = Array.from(degreeLevelMap.values()).map(degree => ({
        degree_level: degree.degree_level,
        total_classes: degree.total_classes,
        total_shifts: degree.shifts.size,
        total_teachers: degree.teachers.size,
        total_departments: degree.departments.size,
        total_majors: degree.majors.size,
        classes: degree.classes,
      }));

      // Sort degree levels by name
      degreeLevels.sort((a, b) => {
        const nameA = a.degree_level.name || '';
        const nameB = b.degree_level.name || '';
        return nameA.localeCompare(nameB);
      });

      // Convert major map to array
      const majors = Array.from(majorMap.values()).map(major => ({
        major: major.major,
        total_classes: major.total_classes,
        total_shifts: major.shifts.size,
        total_teachers: major.teachers.size,
        total_degree_levels: major.degree_levels.size,
        classes: major.classes,
      }));

      // Sort majors by name
      majors.sort((a, b) => {
        const nameA = a.major.name || '';
        const nameB = b.major.name || '';
        return nameA.localeCompare(nameB);
      });

      // Convert all teachers map to array with subjects and classes
      const allTeachers = Array.from(allTeachersMap.values()).map(teacher => ({
        _id: teacher._id,
        info_firstname_en: teacher.info_firstname_en,
        info_lastname_en: teacher.info_lastname_en,
        info_firstname_kh: teacher.info_firstname_kh,
        info_lastname_kh: teacher.info_lastname_kh,
        info_teacher_uef_id: teacher.info_teacher_uef_id,
        info_email: teacher.info_email,
        info_phone_number: teacher.info_phone_number,
        fullName_en: teacher.fullName_en,
        fullName_kh: teacher.fullName_kh,
        subjects: Array.from(teacher.subjects.values()),
        total_subjects: teacher.subjects.size,
        classes: Array.from(teacher.classes.values()),
        total_classes: teacher.classes.size,
      }));

      // Process shifts to include teachers with their subjects
      const processedShifts = shifts.map(shift => {
        const shiftTeachers = [];
        if (shift.teacherSubjects) {
          shift.teacherSubjects.forEach((subjectIds, teacherId) => {
            const teacherData = allTeachersMap.get(teacherId);
            if (teacherData) {
              const subjects = Array.from(subjectIds).map(subjectId => {
                const subject = teacherData.subjects.get(subjectId);
                return subject ? { _id: subject._id, name: subject.name, code: subject.code } : null;
              }).filter(Boolean);
              
              const teacherClasses = Array.from(teacherData.classes.values())
                .filter(cls => cls.shift_id?._id?.toString() === shift.shift._id);
              
              shiftTeachers.push({
                _id: teacherData._id,
                fullName_en: teacherData.fullName_en,
                fullName_kh: teacherData.fullName_kh,
                info_email: teacherData.info_email,
                info_phone_number: teacherData.info_phone_number,
                subjects: subjects,
                total_subjects: subjects.length,
                classes: teacherClasses,
                total_classes: teacherClasses.length,
              });
            }
          });
        }
        
        return {
          shift: shift.shift,
          total_classes: shift.total_classes,
          total_teachers: shift.total_teachers,
          teachers: shiftTeachers,
          classes: shift.classes,
        };
      });

      // Sort shifts by name
      processedShifts.sort((a, b) => {
        const nameA = a.shift.name || "";
        const nameB = b.shift.name || "";
        return nameA.localeCompare(nameB);
      });

      // ============================================
      // UPDATED RESPONSE WITH ROOMS
      // ============================================
      res.json({
        success: true,
        total_classes: getStartedClassData.length,
        total_departments: departments.length,
        total_degree_levels: degreeLevels.length,
        total_majors: majors.length,
        total_shifts: processedShifts.length,
        total_teachers: allTeachers.length,
        total_rooms: rooms.length,
        departments: departments,
        degree_levels: degreeLevels,
        majors: majors,
        teachers: allTeachers,
        shifts: processedShifts,
        rooms: rooms,
        class: getStartedClassData,
      });
    } catch (error) {
      console.error("❌ Error getting started classes:", error);
      res.status(500).json({
        success: false,
        message: "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ!",
        error: error.message,
      });
    }
  },
);







};

module.exports = route;
