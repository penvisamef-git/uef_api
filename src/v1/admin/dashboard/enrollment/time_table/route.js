const mongoose = require("mongoose");
const Model = require("./model");
const getFilteredMongoDB = require("../../../../../util/mongo_db/mongoDB_Queries");
const baseRoute = "academic/time-table";
const { logActivity } = require("../../../../../util/log");
const { checkValidtion } = require("../../../../../util/helper");
const ModelClass = require("../class/model");
const ModelSubject = require("../../subject_and_time/subject/model");
const ModelTeacher = require("../../student_mgt/teacher/model");
const ModelRoom = require("../../building/room/model");

const route = (prop) => {
  const urlAPI = `/${prop.main_route}/${baseRoute}`;

  // ==========================================
  // Helper Functions
  // ==========================================

  /**
   * Validate a single period with new fields
   */
  async function validatePeriod(period, day) {
    // Validate period number (1-20)
    if (period.period_number < 1 || period.period_number > 20) {
      return {
        valid: false,
        message: `ថ្ងៃ ${day} លេខម៉ោងសិក្សាត្រូវតែចន្លោះពី 1 ដល់ 20!`,
      };
    }

    // Validate time
    if (!period.time_from || !period.time_to) {
      return {
        valid: false,
        message: `ថ្ងៃ ${day} សូមបំពេញពេលចាប់ផ្តើម និងបញ្ចប់សម្រាប់ម៉ោងសិក្សាលេខ ${period.period_number}!`,
      };
    }

    // Validate session_has_teach
    if (period.session_has_teach !== undefined && period.session_has_teach < 0) {
      return {
        valid: false,
        message: `ថ្ងៃ ${day} ចំនួនវគ្គបង្រៀនមិនអាចតិចជាង 0!`,
      };
    }

    // Validate session_total
    if (period.session_total !== undefined && period.session_total < 0) {
      return {
        valid: false,
        message: `ថ្ងៃ ${day} ចំនួនវគ្គសរុបមិនអាចតិចជាង 0!`,
      };
    }

    // Validate session_has_teach <= session_total
    if (period.session_has_teach !== undefined && period.session_total !== undefined) {
      if (period.session_has_teach > period.session_total) {
        return {
          valid: false,
          message: `ថ្ងៃ ${day} ចំនួនវគ្គបង្រៀន (${period.session_has_teach}) មិនអាចធំជាងចំនួនវគ្គសរុប (${period.session_total})!`,
        };
      }
    }

    // Validate subject_status
    if (period.subject_status) {
      const validStatuses = ["pending", "start", "closed"];
      if (!validStatuses.includes(period.subject_status)) {
        return {
          valid: false,
          message: `ថ្ងៃ ${day} ស្ថានភាពមុខវិជ្ជាមិនត្រឹមត្រូវ! សូមប្រើ pending, start, ឬ closed`,
        };
      }
    }

    // Validate subject exists
    if (period.subject_id) {
      const subject = await ModelSubject.findOne({
        _id: period.subject_id,
        deleted: false,
      });
      if (!subject) {
        return {
          valid: false,
          message: `ថ្ងៃ ${day} មុខវិជ្ជាសម្រាប់ម៉ោងសិក្សាលេខ ${period.period_number} មិនមានក្នុងប្រព័ន្ធ!`,
        };
      }
    }

    // Validate teacher exists
    if (period.teacher_id) {
      const teacher = await ModelTeacher.findOne({
        _id: period.teacher_id,
        deleted: false,
      });
      if (!teacher) {
        return {
          valid: false,
          message: `ថ្ងៃ ${day} គ្រូបង្រៀនសម្រាប់ម៉ោងសិក្សាលេខ ${period.period_number} មិនមានក្នុងប្រព័ន្ធ!`,
        };
      }
    }

    // Validate room exists (if provided)
    if (period.room_id) {
      const room = await ModelRoom.findOne({
        _id: period.room_id,
        deleted: false,
      });
      if (!room) {
        return {
          valid: false,
          message: `ថ្ងៃ ${day} បន្ទប់សម្រាប់ម៉ោងសិក្សាលេខ ${period.period_number} មិនមានក្នុងប្រព័ន្ធ!`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if two time ranges overlap
   */
  function isTimeOverlapping(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  // ==========================================
  // CREATE - Create new timetable with breaks
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
          { key: "schedule", label: "កាលវិភាគ" },
        ];
        checkValidtion(res, req, requiredFields);

        // Get userLogin
        const { user_id: userId, user_data: userData } = req.session;

        // Field
        const { class_id, schedule, note, status } = req.body;

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

        // Check if timetable already exists for this class
        const existingTimetable = await Model.findOne({
          class_id: class_id,
          deleted: false,
        });

        if (existingTimetable) {
          return res.status(400).json({
            success: false,
            message: "កាលវិភាគសម្រាប់ថ្នាក់នេះមានរួចហើយ!",
          });
        }

        // Validate schedule data
        if (!Array.isArray(schedule) || schedule.length === 0) {
          return res.status(400).json({
            success: false,
            message: "សូមបញ្ជូនកាលវិភាគឱ្យបានត្រឹមត្រូវ!",
          });
        }

        // Valid days
        const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        
        // Validate each day
        for (const daySchedule of schedule) {
          // Validate day
          if (!validDays.includes(daySchedule.day)) {
            return res.status(400).json({
              success: false,
              message: `ថ្ងៃ ${daySchedule.day} មិនត្រឹមត្រូវ! សូមប្រើ Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`,
            });
          }

          // Check for duplicate periods
          const periodNumbers = new Set();
          if (daySchedule.periods && Array.isArray(daySchedule.periods)) {
            for (const period of daySchedule.periods) {
              if (periodNumbers.has(period.period_number)) {
                return res.status(400).json({
                  success: false,
                  message: `ថ្ងៃ ${daySchedule.day} មានម៉ោងសិក្សាលេខ ${period.period_number} ដដែលៗ!`,
                });
              }
              periodNumbers.add(period.period_number);
              
              // Validate period with new fields
              const periodValidation = await validatePeriod(period, daySchedule.day);
              if (!periodValidation.valid) {
                return res.status(400).json({
                  success: false,
                  message: periodValidation.message,
                });
              }
            }
          }

          // Validate breaks if provided
          if (daySchedule.breaks && Array.isArray(daySchedule.breaks)) {
            const breakNumbers = new Set();
            for (const breakItem of daySchedule.breaks) {
              if (breakNumbers.has(breakItem.break_number)) {
                return res.status(400).json({
                  success: false,
                  message: `ថ្ងៃ ${daySchedule.day} មានពេលសម្រាកលេខ ${breakItem.break_number} ដដែលៗ!`,
                });
              }
              breakNumbers.add(breakItem.break_number);

              // Validate break
              if (!breakItem.time_from || !breakItem.time_to) {
                return res.status(400).json({
                  success: false,
                  message: `ថ្ងៃ ${daySchedule.day} សូមបំពេញពេលចាប់ផ្តើម និងបញ្ចប់សម្រាប់ពេលសម្រាក!`,
                });
              }

              if (breakItem.duration_minutes < 1) {
                return res.status(400).json({
                  success: false,
                  message: `ថ្ងៃ ${daySchedule.day} រយៈពេលសម្រាកត្រូវតែច្រើនជាង 0 នាទី!`,
                });
              }

              // Check if break overlaps with periods
              if (daySchedule.periods) {
                for (const period of daySchedule.periods) {
                  if (isTimeOverlapping(breakItem.time_from, breakItem.time_to, period.time_from, period.time_to)) {
                    return res.status(400).json({
                      success: false,
                      message: `ថ្ងៃ ${daySchedule.day} ពេលសម្រាកលេខ ${breakItem.break_number} (${breakItem.time_from} - ${breakItem.time_to}) ត្រួតស៊ីគ្នាជាមួយម៉ោងសិក្សាលេខ ${period.period_number} (${period.time_from} - ${period.time_to})!`,
                    });
                  }
                }
              }
            }
          }

          // Check for time gaps between periods (optional validation)
          if (daySchedule.periods && daySchedule.periods.length > 0) {
            const sortedPeriods = [...daySchedule.periods].sort((a, b) => a.period_number - b.period_number);
            for (let i = 0; i < sortedPeriods.length - 1; i++) {
              const current = sortedPeriods[i];
              const next = sortedPeriods[i + 1];
              
              // Check if there's a gap that might need a break
              if (current.time_to < next.time_from) {
                // Check if there's a break covering this gap
                const hasBreak = daySchedule.breaks && daySchedule.breaks.some(b => 
                  b.time_from >= current.time_to && b.time_to <= next.time_from
                );
                
                // Log warning but don't block creation
                console.log(`⚠️ Gap detected between period ${current.period_number} and ${next.period_number} on ${daySchedule.day}. No break defined.`);
              }
            }
          }
        }

        // Prepare schedule data with breaks and new fields
        const processedSchedule = schedule.map(daySchedule => ({
          day: daySchedule.day,
          periods: daySchedule.periods.map(period => ({
            period_number: period.period_number,
            session_has_teach: period.session_has_teach || 0,
            session_total: period.session_total || 0,
            subject_status: period.subject_status || "pending",
            time_from: period.time_from,
            time_to: period.time_to,
            subject_id: period.subject_id,
            teacher_id: period.teacher_id,
            room_id: period.room_id || null,
            note: period.note || "",
          })),
          breaks: daySchedule.breaks || [],
        }));

        // Save
        const saveData = await Model.create({
          class_id: class_id,
          schedule: processedSchedule,
          note: note || "",
          status: status !== undefined ? status : true,
          deleted: false,
          created_by: userId,
          updated_by: userId,
        });

        // Populate data for response
        const populatedData = await Model.findById(saveData._id)
          .populate("class_id")
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
          });

        // Log
        await logActivity({
          title: `កាលវិភាគថ្មីសម្រាប់ថ្នាក់: ${classData.code} ត្រូវបានបង្កើត!`,
          description: `បង្កើតដោយគណនី: ${userData.firstname + " " + userData.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: populatedData,
          message: `កាលវិភាគសម្រាប់ថ្នាក់ ${classData.code} ត្រូវបានបង្កើត!`,
        });
      } catch (error) {
        console.error("❌ Error creating timetable:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កាលវិភាគសម្រាប់ថ្នាក់នេះមានរួចហើយ!",
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
          message: "មានបញ្ហាក្នុងការបង្កើតកាលវិភាគ! សូមព្យាយាមម្តងទៀត",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // GET BY ID - Get single timetable
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
            .populate("class_id")
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
  // GET BY CLASS - Get timetable by class_id
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

        // Get timetable for this class
        const data = await Model.findOne({
          class_id: class_id,
          deleted: false,
        })
          .populate("class_id")
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
          });

        if (!data) {
          return res.status(404).json({
            success: false,
            message: "មិនមានកាលវិភាគសម្រាប់ថ្នាក់នេះ!",
          });
        }

        return res
          .status(200)
          .json({ success: true, message: "ជោគជ័យ", data: data });
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
  // GET ALL - Get all timetables
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
          .populate("class_id")
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

  // ==========================================
  // UPDATE - Update timetable with new fields
  // ==========================================
  prop.app.put(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: userData } = req.session;
        const { class_id, schedule, note, status } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if timetable exists
        const existingTimetable = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!existingTimetable) {
          return res.status(404).json({
            success: false,
            message: "មិនមានកាលវិភាគក្នុងប្រព័ន្ធ!",
          });
        }

        // ==========================================
        // Build update object dynamically
        // ==========================================
        const updateFields = {
          updated_by: userId,
        };

        if (class_id !== undefined && class_id !== null) {
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

          // Check if timetable already exists for this class (excluding current)
          const duplicateTimetable = await Model.findOne({
            class_id: class_id,
            deleted: false,
            _id: { $ne: id },
          });

          if (duplicateTimetable) {
            return res.status(400).json({
              success: false,
              message: "កាលវិភាគសម្រាប់ថ្នាក់នេះមានរួចហើយ!",
            });
          }

          updateFields.class_id = class_id;
        }

        if (schedule !== undefined && schedule !== null) {
          // Validate schedule data
          if (!Array.isArray(schedule) || schedule.length === 0) {
            return res.status(400).json({
              success: false,
              message: "សូមបញ្ជូនកាលវិភាគឱ្យបានត្រឹមត្រូវ!",
            });
          }

          const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          
          for (const daySchedule of schedule) {
            if (!validDays.includes(daySchedule.day)) {
              return res.status(400).json({
                success: false,
                message: `ថ្ងៃ ${daySchedule.day} មិនត្រឹមត្រូវ!`,
              });
            }

            if (!Array.isArray(daySchedule.periods) || daySchedule.periods.length === 0) {
              return res.status(400).json({
                success: false,
                message: `សូមបញ្ជូនម៉ោងសិក្សាសម្រាប់ថ្ងៃ ${daySchedule.day}!`,
              });
            }

            for (const period of daySchedule.periods) {
              // Validate period number (1-20)
              if (period.period_number < 1 || period.period_number > 20) {
                return res.status(400).json({
                  success: false,
                  message: `លេខម៉ោងសិក្សាត្រូវតែចន្លោះពី 1 ដល់ 20!`,
                });
              }

              // Validate session_has_teach
              if (period.session_has_teach !== undefined && period.session_has_teach < 0) {
                return res.status(400).json({
                  success: false,
                  message: `ចំនួនវគ្គបង្រៀនមិនអាចតិចជាង 0!`,
                });
              }

              // Validate session_total
              if (period.session_total !== undefined && period.session_total < 0) {
                return res.status(400).json({
                  success: false,
                  message: `ចំនួនវគ្គសរុបមិនអាចតិចជាង 0!`,
                });
              }

              // Validate session_has_teach <= session_total
              if (period.session_has_teach !== undefined && period.session_total !== undefined) {
                if (period.session_has_teach > period.session_total) {
                  return res.status(400).json({
                    success: false,
                    message: `ចំនួនវគ្គបង្រៀន (${period.session_has_teach}) មិនអាចធំជាងចំនួនវគ្គសរុប (${period.session_total})!`,
                  });
                }
              }

              // Validate subject_status
              if (period.subject_status) {
                const validStatuses = ["pending", "start", "closed"];
                if (!validStatuses.includes(period.subject_status)) {
                  return res.status(400).json({
                    success: false,
                    message: `ស្ថានភាពមុខវិជ្ជាមិនត្រឹមត្រូវ! សូមប្រើ pending, start, ឬ closed`,
                  });
                }
              }

              const subject = await ModelSubject.findOne({
                _id: period.subject_id,
                deleted: false,
              });
              if (!subject) {
                return res.status(404).json({
                  success: false,
                  message: `មុខវិជ្ជានេះមិនមានក្នុងប្រព័ន្ធ!`,
                });
              }

              const teacher = await ModelTeacher.findOne({
                _id: period.teacher_id,
                deleted: false,
              });
              if (!teacher) {
                return res.status(404).json({
                  success: false,
                  message: `គ្រូបង្រៀននេះមិនមានក្នុងប្រព័ន្ធ!`,
                });
              }

              if (period.room_id) {
                const room = await ModelRoom.findOne({
                  _id: period.room_id,
                  deleted: false,
                });
                if (!room) {
                  return res.status(404).json({
                    success: false,
                    message: `បន្ទប់នេះមិនមានក្នុងប្រព័ន្ធ!`,
                  });
                }
              }
            }
          }

          // Process schedule with new fields
          updateFields.schedule = schedule.map(daySchedule => ({
            day: daySchedule.day,
            periods: daySchedule.periods.map(period => ({
              period_number: period.period_number,
              session_has_teach: period.session_has_teach || 0,
              session_total: period.session_total || 0,
              subject_status: period.subject_status || "pending",
              time_from: period.time_from,
              time_to: period.time_to,
              subject_id: period.subject_id,
              teacher_id: period.teacher_id,
              room_id: period.room_id || null,
              note: period.note || "",
            })),
            breaks: daySchedule.breaks || [],
          }));
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
          .populate("class_id")
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
          });

        // Log
        await logActivity({
          title: `កាលវិភាគសម្រាប់ថ្នាក់: ${updatedData.class_id?.code || ''} ត្រូវបានកែប្រែ!`,
          description: `កែប្រែដោយគណនី: ${userData.firstname + " " + userData.lastname}`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedData,
          message: "កាលវិភាគត្រូវបានកែប្រែ!",
        });
      } catch (error) {
        console.error("❌ Error updating timetable:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "កាលវិភាគសម្រាប់ថ្នាក់នេះមានរួចហើយ!",
            error: error.message,
          });
        }

        res.status(500).json({
          success: false,
          message: "មានបញ្ហាក្នុងការកែប្រែកាលវិភាគ!",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    },
  );

  // ==========================================
  // SOFT DELETE - Soft delete timetable (move to trash)
  // ==========================================
  prop.app.delete(
    `${urlAPI}/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: userData } = req.session;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if timetable exists
        const timetable = await Model.findOne({
          _id: id,
          deleted: false,
        });

        if (!timetable) {
          return res.status(404).json({
            success: false,
            message: "មិនមានកាលវិភាគក្នុងប្រព័ន្ធ!",
          });
        }

        // Soft delete
        const updatedTimetable = await Model.findByIdAndUpdate(
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
          title: `កាលវិភាគសម្រាប់ថ្នាក់: ${timetable.class_id} ត្រូវបានផ្លាស់ទៅធុងសំរាម!`,
          description: `គណនី: ${userData.firstname + " " + userData.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: updatedTimetable,
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
  // RESTORE - Restore soft deleted timetable
  // ==========================================
  prop.app.put(
    `${urlAPI}/restore/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: userData } = req.session;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if timetable exists and is deleted
        const timetable = await Model.findOne({
          _id: id,
          deleted: true,
        });

        if (!timetable) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងធុងសំរាម!",
          });
        }

        // Restore
        const restoredTimetable = await Model.findByIdAndUpdate(
          id,
          {
            deleted: false,
            deleted_at: null,
            deleted_by: null,
            updated_by: userId,
          },
          { new: true },
        )
          .populate("class_id")
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
          });

        // Log
        await logActivity({
          title: `កាលវិភាគសម្រាប់ថ្នាក់: ${timetable.class_id} ត្រូវបានស្ដារមកវិញ!`,
          description: `គណនី: ${userData.firstname + " " + userData.lastname} បានស្ដារទិន្នន័យមកវិញ។`,
          categoryTitle: "academic_management",
          createdBy: userId,
          req,
        });

        res.status(200).json({
          success: true,
          data: restoredTimetable,
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
  // DELETE FOREVER - Permanently delete timetable
  // ==========================================
  prop.app.delete(
    `${urlAPI}/forever/:id`,
    prop.api_auth,
    prop.jwt_auth,
    prop.request_user,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { user_id: userId, user_data: userData } = req.session;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ",
          });
        }

        // Check if timetable exists
        const timetable = await Model.findOne({
          _id: id,
        });

        if (!timetable) {
          return res.status(404).json({
            success: false,
            message: "មិនមានទិន្នន័យក្នុងប្រព័ន្ធ!",
          });
        }

        // Permanently delete
        await Model.findByIdAndDelete(id);

        // Log
        await logActivity({
          title: `កាលវិភាគសម្រាប់ថ្នាក់: ${timetable.class_id} ត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍!`,
          description: `គណនី: ${userData.firstname + " " + userData.lastname} បានលុបទិន្នន័យចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍។`,
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
  // GET TRASH - Get all soft deleted timetables
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
          .populate("class_id")
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
          { path: "class_id" },
          { path: "schedule.periods.subject_id" },
          { path: "schedule.periods.teacher_id" },
          { path: "schedule.periods.room_id" },
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