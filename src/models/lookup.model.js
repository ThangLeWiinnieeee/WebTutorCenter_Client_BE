const mongoose = require("mongoose");
const { LOOKUP_TYPES } = require("../constants/lookup");

const lookupSchema = new mongoose.Schema(
  {
    // Type của lookup: "subject", "occupation_status", "gender", "province", "district"
    type: {
      type: String,
      required: true,
      enum: Object.values(LOOKUP_TYPES),
      index: true,
    },
    // Giá trị lookup
    value: {
      type: String,
      required: true,
    },
    // Label hiển thị cho user
    label: {
      type: String,
      required: true,
    },
    // Province ID/name (dùng cho district - để biết province nào)
    parentId: {
      type: String,
      default: null,
    },
    // Order for sorting
    order: {
      type: Number,
      default: 0,
    },
    // Active flag
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index để query nhanh theo type và isActive
lookupSchema.index({ type: 1, isActive: 1 });

// Unique index: type + value (không có 2 cái giống nhau)
lookupSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model("Lookup", lookupSchema);
