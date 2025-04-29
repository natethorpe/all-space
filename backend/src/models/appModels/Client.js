// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\models\appModels\Client.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  name: { type: String, required: true },
  phone: String,
  country: String,
  address: String,
  email: String,
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  // New fields for sponsors, artists, and business contacts
  contactType: { 
    type: String, 
    enum: ['sponsor', 'artist', 'business', 'attendee'], 
    default: 'attendee' 
  },
  // Sponsor fields
  sponsorshipDetails: [{
    tier: String, // e.g., "Gold"
    amount: Number,
    deliverables: [String], // e.g., ["Logo on stage", "VIP shoutout"]
    festivalEvent: String, // e.g., "Summer Drive-In Fest 2025"
  }],
  // Artist fields
  artistDetails: {
    stageName: String,
    genre: String,
    pastPerformances: [{ event: String, date: Date }],
    bookingContact: String,
  },
  // Business contact fields
  businessDetails: {
    serviceType: String, // e.g., "repair", "catering"
    company: String,
    availability: String,
  },
  // Attendee fields
  ticketPurchases: [{ event: String, quantity: Number }],
});

schema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Client', schema);
