// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\models\appModels\Sponsors.js
// Historical Note: Created April 10, 2025, to define the Sponsors schema; updated April 11, 2025, to add assignedTo field; updated April 12, 2025, to add image field.
// Purpose: Defines the Mongoose schema for the Sponsors collection, used to store sponsor data including schedules, email tasks, and historical data.
// Functionality:
//   - Stores sponsor details like name, likeliness, estimated cost, tier level, fit score, email, and image.
//   - Includes arrays for schedules (events), email tasks, and historical data (e.g., email interactions).
//   - Supports timestamps and a removed flag for soft deletion.
// Structure:
//   - Main fields: name, likeliness, est_cost, tier_level, fit_score, email, assignedTo, image.
//   - Sub-documents: schedule (events), email_tasks, historicalData.
//   - Metadata: createdAt, updatedAt, removed.
// Connections:
//   - Used by: sponsorController.js (CRUD operations).
//   - Populated fields: assignedTo (references Admin model).
// Dependencies:
//   - Mongoose: For schema definition and MongoDB interaction.
// Current Features:
//   - Validates tier_level with an enum (Tier 1 to Tier 5).
//   - Supports flexible email_tasks and historicalData with Mixed type.
//   - Includes timestamps for creation and update tracking.
// Status: As of 04/12/2025, added image field for sponsor table display.
// Updates (04/10/2025):
//   - Created schema to match database structure.
//     - Why: Ensure Mongoose schema aligns with real sponsor data (e.g., PepsiCo).
//     - How: Defined fields based on db.sponsors.find() output.
//     - Impact: Prevents validation errors, supports all features.
//   - Added tier_level enum validation.
//     - Why: Previous data had invalid 'Very High' value causing 500 errors.
//     - How: Set enum to ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'].
//     - Impact: Ensures valid tier_level values.
// Updates (04/11/2025):
//   - Added assignedTo field with reference to Admin model.
//     - Why: 500 error due to populate('assignedTo') in sponsorController.js.
//     - How: Added assignedTo as a reference to the Admin model.
//     - Impact: Allows population of assignedTo, fixes sponsor loading.
// Updates (04/12/2025):
//   - Added image field for sponsor images.
//     - Why: User requested an image column in the sponsor table.
//     - How: Added image field as a string (URL).
//     - Impact: Allows displaying sponsor images in the table.
//   - Next Steps: Test sponsor loading with images, verify new actions work.
// Future Enhancements:
//   - Add validation for email format.
//   - Add indexes for faster queries on name and tier_level.

const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  likeliness: {
    type: Number,
    min: 0,
    max: 100,
  },
  est_cost: {
    type: Number,
    min: 0,
  },
  tier_level: {
    type: String,
    enum: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'],
    default: 'Tier 1',
  },
  fit_score: {
    type: Number,
    min: 0,
    max: 100,
  },
  email: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  schedule: [{
    title: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  }],
  email_tasks: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  historicalData: [{
    type: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    date: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  removed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Sponsor', sponsorSchema);
