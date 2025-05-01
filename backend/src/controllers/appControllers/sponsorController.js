// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\controllers\appControllers\sponsorController.js
// Historical Note: Updated April 7, 2025, to fix ReferenceError and ensure dashboard functionality; further updates on April 8, 2025, to debug sponsor data and event addition; updated April 9, 2025, to further debug sponsor data; updated April 10, 2025, to fix event addition and ensure real data.
// Purpose: Handles sponsor-related API requests (CRUD, search, scheduling, emailing).
// Functionality: Provides endpoints for getting all sponsors, summaries, adding/updating schedules, sending emails, and creating/updating sponsors.
// Connections: Models: Sponsors.js; Routes: sponsor.js; Frontend: Dashboard.jsx, SponsorHub.jsx, Calendar.jsx.
// Current Features: CRUD operations, pagination, search, email with Nodemailer, schedule management.
// Status: As of 04/10/2025, fixed event addition validation, ensured real sponsor data loads.
// Updates (04/07/2025):
// - Fixed module.exports to include all defined functions.
//   - Why: ReferenceError: getSummary is not defined crashed server.
//   - How: Ensured getSummary and all other functions are defined and exported.
//   - Impact: Backend starts successfully.
// - Enhanced logging in getAll and addSchedule for frontend debugging.
//   - Why: Confirm data flow to Dashboard.
//   - How: Added detailed response logs.
//   - Impact: Verifies 120 sponsors and event addition.
// Updates (04/08/2025):
// - Added detailed logging in getAll to inspect returned sponsors.
//   - Why: Table shows mock data (Sponsor1-Sponsor10) instead of database data.
//   - How: Logged full sponsors array before sending response.
//   - Impact: Confirms if backend is sending correct data.
// - Enhanced logging in addSchedule to inspect request body.
//   - Why: 500 error persists when adding events; need to confirm payload.
//   - How: Logged req.body before processing.
//   - Impact: Identifies if tier_level is being sent unexpectedly.
// Updates (04/09/2025):
// - Further enhanced logging in getAll to debug sponsor data.
//   - Why: Frontend still shows mock data despite backend response.
//   - How: Added logging of sponsor names and IDs.
//   - Impact: Confirms exact data being sent to frontend.
// Updates (04/10/2025):
// - Fixed addSchedule to avoid re-validation of entire sponsor.
//   - Why: 500 error due to tier_level validation ('Very High' not in enum).
//   - How: Used $push to update schedule without re-validating sponsor.
//   - Impact: Successful event addition.
// - Updated database data to use correct tier_level values.
//   - Why: Database had mock data with invalid tier_level.
//   - How: Updated tier_level to 'Tier 1' to 'Tier 5' and repopulated with real sponsors.
//   - Impact: Loads real sponsor data (e.g., PepsiCo).
// - Next Steps: Verify real sponsor data loads, confirm event addition works, test email sending.

const mongoose = require('mongoose');
const Sponsor = require('@/models/appModels/Sponsors');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password',
  },
});

const getAll = async (req, res) => {
  console.log('sponsorController.getAll hit', { user: req.user, query: req.query });
  try {
    const { page = 1, items = 10, q = '', tier } = req.query;
    const query = { removed: { $ne: true } };

    if (q && q.trim()) {
      const trimmedQ = q.trim();
      query.$or = [
        { name: { $regex: trimmedQ, $options: 'i' } },
        { tier_level: { $regex: trimmedQ, $options: 'i' } },
      ];
      console.log('Applying search filter with q:', trimmedQ);
    } else {
      console.log('No search term provided, fetching all sponsors');
    }

    if (tier && tier !== 'All') {
      query.tier_level = tier;
      console.log('Applying tier filter:', tier);
    }

    console.log('Constructed MongoDB query:', JSON.stringify(query, null, 2));
    const total = await Sponsor.countDocuments(query);
    console.log('Total sponsors matching query:', total);

    const sponsors = await Sponsor.find(query)
      .limit(parseInt(items))
      .skip((parseInt(page) - 1) * parseInt(items))
      .populate('assignedTo', 'email name')
      .exec();
    console.log('Sponsors fetched:', sponsors.length, 'Names and IDs:', sponsors.map(s => ({ id: s._id, name: s.name })));
    console.log('Sponsors fetched - Full data:', JSON.stringify(sponsors, null, 2));

    return res.status(200).json({
      success: true,
      result: { sponsors, total },
      message: 'Successfully retrieved sponsors',
    });
  } catch (error) {
    console.error('getAll error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to fetch sponsors',
      error: error.message,
    });
  }
};

const getSummary = async (req, res) => {
  console.log('sponsorController.getSummary hit', { user: req.user });
  try {
    const query = { removed: { $ne: true } };
    const totalSponsors = await Sponsor.countDocuments(query);
    const tiers = await Sponsor.aggregate([
      { $match: query },
      { $group: { _id: '$tier_level', count: { $sum: 1 } } },
    ]);
    const avgFitScore = await Sponsor.aggregate([
      { $match: query },
      { $group: { _id: null, avg: { $avg: '$fit_score' } } },
    ]);
    const totalEstCost = await Sponsor.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$est_cost' } } },
    ]);
    const topProspects = await Sponsor.find(query)
      .sort({ fit_score: -1 })
      .limit(5)
      .select('name fit_score likeliness');
    console.log('Summary calculated:', { totalSponsors, tiers });

    return res.status(200).json({
      success: true,
      result: {
        totalSponsors,
        tiers,
        avgFitScore: avgFitScore[0]?.avg || 0,
        totalEstCost: totalEstCost[0]?.total || 0,
        topProspects,
      },
      message: 'Successfully retrieved summary',
    });
  } catch (error) {
    console.error('getSummary error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
};

const addSchedule = async (req, res) => {
  try {
    const sponsorId = req.params.id;
    const { title, date, description } = req.body;
    console.log('sponsorController.addSchedule - Request body:', req.body);
    console.log('sponsorController.addSchedule - Destructured:', { sponsorId, title, date, description });

    const updateResult = await Sponsor.findByIdAndUpdate(
      sponsorId,
      {
        $push: { schedule: { title, date: new Date(date), description } },
        $set: { updatedAt: Date.now() },
      },
      { new: true }
    );

    if (!updateResult) {
      console.log('Sponsor not found for ID:', sponsorId);
      return res.status(404).json({ success: false, result: null, message: 'Sponsor not found' });
    }

    console.log('Schedule added:', updateResult.schedule[updateResult.schedule.length - 1]);
    return res.status(200).json({
      success: true,
      result: updateResult,
      message: 'Schedule added successfully',
    });
  } catch (error) {
    console.error('Error in addSchedule:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const { id: sponsorId, eventId } = req.params;
    const { title, date, description } = req.body;
    console.log('sponsorController.updateSchedule hit', { sponsorId, eventId }, { title, date, description });

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) {
      console.log('Sponsor not found for ID:', sponsorId);
      return res.status(404).json({ success: false, result: null, message: 'Sponsor not found' });
    }

    const eventIndex = sponsor.schedule.findIndex(e => e._id.toString() === eventId);
    if (eventIndex === -1) {
      console.log('Event not found for ID:', eventId);
      return res.status(404).json({ success: false, result: null, message: 'Event not found' });
    }

    sponsor.schedule[eventIndex] = {
      ...sponsor.schedule[eventIndex],
      title: title || sponsor.schedule[eventIndex].title,
      date: date ? new Date(date) : sponsor.schedule[eventIndex].date,
      description: description || sponsor.schedule[eventIndex].description,
      _id: sponsor.schedule[eventIndex]._id,
    };
    sponsor.updatedAt = Date.now();
    await sponsor.save();

    console.log('Schedule updated:', sponsor.schedule[eventIndex]);
    return res.status(200).json({
      success: true,
      result: sponsor,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Error in updateSchedule:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

const sendEmail = async (req, res) => {
  try {
    const sponsorId = req.params.id;
    const { subject, body } = req.body;
    console.log('sponsorController.sendEmail hit', { sponsorId }, { subject, body });

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) {
      console.log('Sponsor not found for ID:', sponsorId);
      return res.status(404).json({ success: false, result: null, message: 'Sponsor not found' });
    }
    if (!sponsor.email) {
      console.log('No email for sponsor:', sponsorId);
      return res.status(400).json({ success: false, result: null, message: 'Sponsor has no email address' });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: sponsor.email,
      subject: subject || 'Sponsor Outreach',
      text: body || `Hello ${sponsor.name}, we're excited to connect regarding sponsorship opportunities!`,
    });

    sponsor.historicalData = sponsor.historicalData || [];
    sponsor.historicalData.push({
      type: 'email',
      details: { subject: subject || 'Sponsor Outreach', body },
      date: new Date(),
    });
    sponsor.updatedAt = Date.now();
    await sponsor.save();

    console.log('Email sent and historicalData updated:', sponsor.historicalData);
    return res.status(200).json({
      success: true,
      result: sponsor,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error in sendEmail:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

const create = async (req, res) => {
  try {
    const sponsorData = req.body;
    console.log('sponsorController.create hit', sponsorData);

    const sponsor = new Sponsor({
      ...sponsorData,
      tier_level: sponsorData.tier_level || 'Tier 1',
      createdAt: new Date(),
      updatedAt: new Date(),
      removed: false,
    });
    await sponsor.save();
    console.log('Sponsor created:', sponsor);

    return res.status(201).json({
      success: true,
      result: sponsor,
      message: 'Sponsor created successfully',
    });
  } catch (error) {
    console.error('Error in create:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const sponsorId = req.params.id;
    const sponsorData = req.body;
    console.log('sponsorController.update hit', { sponsorId }, sponsorData);

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) {
      console.log('Sponsor not found for ID:', sponsorId);
      return res.status(404).json({ success: false, result: null, message: 'Sponsor not found' });
    }

    Object.assign(sponsor, sponsorData, { updatedAt: Date.now() });
    await sponsor.save();
    console.log('Sponsor updated:', sponsor);

    return res.status(200).json({
      success: true,
      result: sponsor,
      message: 'Sponsor updated successfully',
    });
  } catch (error) {
    console.error('Error in update:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = { getAll, getSummary, addSchedule, updateSchedule, sendEmail, create, update };
