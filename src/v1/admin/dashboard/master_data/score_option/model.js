const mongoose = require("mongoose");

const scoreOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // Score options array with more fields
    score_options: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        description: {
          type: String,
          trim: true,
          default: "",
        },
        is_required: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Total score
    total: {
      type: Number,
      required: true,
      default: 100,
      min: 0,
    },

    // Max score allowed
    max_score: {
      type: Number,
      default: 100,
      min: 0,
    },

    // Minimum pass score
    pass_score: {
      type: Number,
      default: 50,
      min: 0,
    },

    // >>>>>> Default <<<<< //
    note: {
      type: String,
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

module.exports = mongoose.model("MasterDataScoreOption", scoreOptionSchema);