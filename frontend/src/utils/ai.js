// frontend/src/utils/ai.js
// Nate’s instruction from 04/02/2025: Fix fit score prediction range
// Why: Raw scores over-scale to 100, should match 65–85 range
// How: Remove *100 scaling, tweak weights, validate with training data
// Notes:
// - Purpose: AI predictions for Dashboard.jsx (fit scores, email drafts).
// - Connects to: Dashboard.jsx (consumer), sponsorController.js (future fit_score updates).
// - Hurdle: NaN fixed (04/01/2025), scaling fixed (04/02/2025) to match training range (65–85).
// - Model: Linear regression, weights adjusted (0.9, 0.00001) to prioritize likeliness.
// Next: Test PepsiCo (90, 75000) yields ~85, Sponsor 6 (65, 12174) yields ~65
import * as tf from '@tensorflow/tfjs';

export const predictFitScore = async (sponsorData) => {
  const { likeliness = 50, est_cost = 10000 } = sponsorData || {};
  console.log('predictFitScore inputs:', { likeliness, est_cost });
  try {
    const model = tf.sequential();
    // Weights: likeliness (0.9) dominant, est_cost (0.00001) minor
    model.add(tf.layers.dense({ units: 1, inputShape: [2], weights: [tf.tensor2d([[0.9], [0.00001]]), tf.zeros([1])] }));
    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

    // Normalize inputs (likeliness: 0-100, est_cost: 0-100000)
    const normLikeliness = likeliness / 100;
    const normEstCost = est_cost / 100000;
    console.log('Normalized inputs:', { normLikeliness, normEstCost });

    // Training data
    const xs = tf.tensor2d([[90/100, 75000/100000], [80/100, 50000/100000], [70/100, 30000/100000]]);
    const ys = tf.tensor2d([[85/100], [75/100], [65/100]]); // Normalized outputs
    await model.fit(xs, ys, { epochs: 50 });

    const input = tf.tensor2d([[normLikeliness, normEstCost]]);
    const prediction = model.predict(input);
    const fitScore = prediction.dataSync()[0];
    console.log('Predicted fit score raw:', fitScore);
    const finalScore = Math.min(Math.max(Math.round(fitScore * 100), 0), 100); // Scale back to 0-100
    console.log('Final fit score:', finalScore);
    return finalScore;
  } catch (error) {
    console.error('Fit score prediction failed:', error);
    return likeliness || 50; // Fallback
  }
};

export const draftEmail = (sponsor) => {
  return `Hello ${sponsor.name || 'Sponsor'},\n\nWe’re excited to partner with you for ${sponsor.event || 'our event'}! Based on your profile (Fit Score: ${sponsor.fit_score || 'N/A'}), we think you’re a great match. Let’s schedule a call.\n\nBest,\n${sponsor.assignedTo?.name || 'Nate'}`;
};
