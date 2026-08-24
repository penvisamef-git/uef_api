const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {

    student_joined: {
      type: String, // passed_previous, add_subject, new_student
      required: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    scores: [
      {
        subject_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        midterm: {
          type: Number,
          min: 0,
          max: 25,
          default: 0,
        },
        final: {
          type: Number,
          min: 0,
          max: 45,
          default: 0,
        },
        assignment: {
          type: Number,
          min: 0,
          max: 20,
          default: 0,
        },

        attendance: {
          type: Number,
          min: 0,
          max: 10,
          default: 0,
        },

        total: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        grade: {
          type: String,
          enum: ["A", "B", "C", "D", "F"],
          default: null,
        },
        is_passed: {
          type: Boolean,
          default: false,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
      },


    ],


    // ==========================================
    // Attendance Summary
    // ==========================================
    total_absent_session: {
      type: Number,
      default: 0,
    },
 



    // >>>>>> Defualt <<<<< //
    note: String,
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
  },
);
module.exports = mongoose.model("StudentInClass", userSchema);


