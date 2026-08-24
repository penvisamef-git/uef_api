const mongoose = require("mongoose");

// ==========================================
// Session Status Enum
// ==========================================
const SESSION_STATUS = {
  PENDING: "pending",
  START: "start",
  CLOSED: "closed",
  CANCELLED: "cancelled",
};

// ==========================================
// Day Enum
// ==========================================
const DAYS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

// ==========================================
// Session Schema (for tracking each session)
// ==========================================
const sessionSchema = new mongoose.Schema({
  session_number: {
    type: Number,
    required: true,
    min: 1,
  },
  total_sessions: {
    type: Number,
    required: true,
    min: 1,
  },
  day: {
    type: String,
    enum: Object.values(DAYS),
    required: true,
  },
  period_number: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
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
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.PENDING,
  },
  is_completed: {
    type: Boolean,
    default: false,
  },
  completed_date: {
    type: Date,
    default: null,
  },
  note: {
    type: String,
    trim: true,
    default: "",
  },
});

// ==========================================
// Subject Schedule Schema
// ==========================================
const subjectScheduleSchema = new mongoose.Schema({
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
  total_sessions: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  completed_sessions: {
    type: Number,
    default: 0,
  },
  sessions: [sessionSchema],
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.PENDING,
  },
  note: {
    type: String,
    trim: true,
    default: "",
  },
});

// ==========================================
// Main Timetable Schema
// ==========================================
const timetableSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // ==========================================
    // Schedule with period numbers and breaks
    // ==========================================
    schedule: [
      {
        day: {
          type: String,
          enum: Object.values(DAYS),
          required: true,
        },
        // Teaching periods
        periods: [
          {
            period_number: {
              type: Number,
              required: true,
              min: 1,
              max: 20,
            },
            session_has_teach: {
              type: Number,
              required: true,
              default: 0,
            },
            session_total: {
              type: Number,
              required: true,
              default: 0,
            },
            subject_status: {
              type: String,
              enum: Object.values(SESSION_STATUS),
              default: SESSION_STATUS.PENDING,
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
            },
            // Reference to subject schedule sessions
            subject_session_ref: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "SubjectSchedule",
            },
            note: {
              type: String,
              trim: true,
              default: "",
            },
          },
        ],
        // Break periods between teaching periods
        breaks: [
          {
            break_number: {
              type: Number,
              required: true,
              min: 1,
            },
            break_name: {
              type: String,
              required: true,
              trim: true,
              default: "Break",
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
            duration_minutes: {
              type: Number,
              required: true,
              min: 1,
            },
            note: {
              type: String,
              trim: true,
              default: "",
            },
          },
        ],
      },
    ],

    // ==========================================
    // Subject Schedules (organized by subject)
    // ==========================================
    subject_schedules: [subjectScheduleSchema],

    // ==========================================
    // Default Fields
    // ==========================================
    academic_year: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: String,
      enum: ["1", "2"],
      required: true,
    },
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
    deleted_at: {
      type: Date,
      default: null,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_date", updatedAt: "updated_date" },
  }
);


module.exports = mongoose.model("TimeTable", timetableSchema);