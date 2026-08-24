const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

     code: {
      type: String,
      required: false,
    },


            credit: {
      type: Number,
      required: false,
    },

        name_in_eng: {
      type: String,
      required: false,
    },



        code: {
      type: String,
      required: false,
    },


    major_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      required: true,
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
module.exports = mongoose.model("Subject", userSchema);
