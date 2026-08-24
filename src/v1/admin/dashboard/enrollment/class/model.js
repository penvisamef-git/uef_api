const mongoose = require("mongoose");

// ==========================================
// Period Schema (for each teaching session)
// ==========================================
const PeriodSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  time_from: {
    type: String,
    required: true,
    trim: true,
  },
  time_to: {
    type: String,
    required: true,
    trim: true,
  },
  period_number: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  session_number: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ["pending", "start", "closed", "cancelled"],
    default: "pending",
  },
  note: {
    type: String,
    trim: true,
    default: "",
  },
});

// ==========================================
// Subject Schedule Schema (for each subject in class)
// ==========================================
const SubjectScheduleSchema = new mongoose.Schema({
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  session_total: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  session_have_teach: {
    type: Number,
    default: 0,
    min: 0,
  },
  score_option_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MasterDataScoreOption",
  },
  subject_status: {
    type: String,
    enum: ["pending", "start", "closed"],
    default: "pending",
  },
  periods: [PeriodSchema],
  note: {
    type: String,
    trim: true,
    default: "",
  },
});

// ==========================================
// Score Schema (for each subject) - Dynamic
// ==========================================
const ScoreSchema = new mongoose.Schema({
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  score_detail: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    default: {},
  },
});

// ==========================================
// Attendance Schema (for each subject)
// ==========================================
const AttendanceSchema = new mongoose.Schema({
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  total_absence_unreport: {
    type: Number,
    required: false,
    default: 0,
  },
  total_absence_report: {
    type: Number,
    required: false,
    default: 0,
  },
});

// ==========================================
// Student Schema (embedded in class)
// ==========================================
const StudentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  attendance: [AttendanceSchema],
  score: [ScoreSchema],
});

// ==========================================
// Main Class Schema
// ==========================================
const classSchema = new mongoose.Schema(
  {
    batch: {
      type: String,
      required: true,
    },
    group_number: {
      type: String,
      required: false,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    degree_level_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataDegreeLevel",
      required: true,
    },
    major_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      required: true,
    },
    year_study_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataYearStudy",
      required: true,
    },
    semester_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataSemester",
      required: true,
    },
    year_study_from: {
      type: Number,
      required: true,
    },
    year_study_to: {
      type: Number,
      required: true,
    },
    shift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterDataShift",
      required: true,
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    class_status: {
      type: String,
      enum: ["pending", "start", "closed"],
      default: "start",
    },
    schedule: [SubjectScheduleSchema],
    students: [StudentSchema],
    note: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_date", updatedAt: "updated_date" },
  }
);

classSchema.index({ code: 1 }, { unique: true });
classSchema.index({ batch: 1, code: 1 });
classSchema.index({ major_id: 1, year_study_id: 1 });
classSchema.index({ "students.student_id": 1 });

classSchema.methods.generateScoreDetail = function(scoreOption) {
  const scoreDetail = {};
  if (scoreOption && scoreOption.score_options && Array.isArray(scoreOption.score_options)) {
    scoreOption.score_options.forEach(option => {
      const key = option.name.toLowerCase().replace(/\s+/g, '_');
      scoreDetail[key] = 0;
    });
  }
  scoreDetail.total = 0;
  scoreDetail.grade = "";
  return scoreDetail;
};

classSchema.methods.initializeStudentScores = async function(studentId) {
  const student = this.students.find(
    s => s.student_id.toString() === studentId.toString()
  );
  if (!student) {
    throw new Error('មិនមានសិស្សនេះក្នុងថ្នាក់!');
  }
  student.score = [];
  const ScoreOptionModel = mongoose.model('MasterDataScoreOption');
  for (const subjectSchedule of this.schedule) {
    let scoreDetail = { total: 0, grade: "" };
    if (subjectSchedule.score_option_id) {
      const scoreOption = await ScoreOptionModel.findById(subjectSchedule.score_option_id);
      if (scoreOption && scoreOption.score_options) {
        scoreOption.score_options.forEach(option => {
          const key = option.name.toLowerCase().replace(/\s+/g, '_');
          scoreDetail[key] = 0;
        });
      }
    }
    student.score.push({
      subject_id: subjectSchedule.subject_id,
      score_detail: scoreDetail
    });
  }
  return student;
};

classSchema.methods.rebuildAllStudentScores = async function() {
  const ScoreOptionModel = mongoose.model('MasterDataScoreOption');
  for (const student of this.students) {
    const newScores = [];
    for (const subjectSchedule of this.schedule) {
      let scoreDetail = { total: 0, grade: "" };
      const existingScore = student.score.find(
        s => s.subject_id.toString() === subjectSchedule.subject_id.toString()
      );
      if (subjectSchedule.score_option_id) {
        const scoreOption = await ScoreOptionModel.findById(subjectSchedule.score_option_id);
        if (scoreOption && scoreOption.score_options) {
          scoreOption.score_options.forEach(option => {
            const key = option.name.toLowerCase().replace(/\s+/g, '_');
            const existingValue = existingScore?.score_detail?.[key];
            scoreDetail[key] = existingValue !== undefined ? existingValue : 0;
          });
        }
      }
      if (existingScore) {
        scoreDetail.total = existingScore.score_detail?.total || 0;
        scoreDetail.grade = existingScore.score_detail?.grade || "";
      }
      newScores.push({
        subject_id: subjectSchedule.subject_id,
        score_detail: scoreDetail
      });
    }
    student.score = newScores;
  }
  return this.students;
};

classSchema.pre('save', async function(next) {
  try {
    if (this.isModified('schedule')) {
      const ScoreOptionModel = mongoose.model('MasterDataScoreOption');
      for (const student of this.students) {
        const newScores = [];
        for (const subjectSchedule of this.schedule) {
          let scoreDetail = { total: 0, grade: "" };
          const existingScore = student.score.find(
            s => s.subject_id.toString() === subjectSchedule.subject_id.toString()
          );
          if (subjectSchedule.score_option_id) {
            const scoreOption = await ScoreOptionModel.findById(subjectSchedule.score_option_id);
            if (scoreOption && scoreOption.score_options) {
              scoreOption.score_options.forEach(option => {
                const key = option.name.toLowerCase().replace(/\s+/g, '_');
                const existingValue = existingScore?.score_detail?.[key];
                scoreDetail[key] = existingValue !== undefined ? existingValue : 0;
              });
            }
          }
          if (existingScore) {
            scoreDetail.total = existingScore.score_detail?.total || 0;
            scoreDetail.grade = existingScore.score_detail?.grade || "";
          }
          newScores.push({
            subject_id: subjectSchedule.subject_id,
            score_detail: scoreDetail
          });
        }
        student.score = newScores;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Class", classSchema);