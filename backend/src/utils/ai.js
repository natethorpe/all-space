// frontend/src/utils/ai.js
// Nate’s instruction from 04/01/2025: Fix NaN in fit score prediction
// Why: Invalid input data causes model to return NaN
// How: Add fallbacks, log inputs for debugging
// Next: Test with sponsor data, verify scores
import * as tf from '@tensorflow/tfjs';

export const predictFitScore = async (sponsorData) => {
  const { likeliness = 50, est_cost = 10000 } = sponsorData; // Fallbacks
  console.log('predictFitScore inputs:', { likeliness, est_cost });
  try {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [2] }));
    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

    // Training data
    const xs = tf.tensor2d([[90, 75000], [80, 50000], [70, 30000]]);
    const ys = tf.tensor2d([[85], [75], [65]]);
    await model.fit(xs, ys, { epochs: 10 });

    const input = tf.tensor2d([[likeliness, est_cost]]);
    const prediction = model.predict(input);
    const fitScore = prediction.dataSync()[0];
    console.log('Predicted fit score:', fitScore);
    return Math.min(Math.max(Math.round(fitScore) || 50, 0), 100); // Fallback to 50 if NaN
  } catch (error) {
    console.error('Fit score prediction failed:', error);
    return likeliness || 50; // Fallback to likeliness or default
  }
};

export const draftEmail = (sponsor) => {
  return `Hello ${sponsor.name || 'Sponsor'},\n\nWe’re excited to partner with you for ${sponsor.event || 'our event'}! Based on your profile (Fit Score: ${sponsor.fit_score || 'N/A'}), we think you’re a great match. Let’s schedule a call.\n\nBest,\n${sponsor.assignedTo?.name || 'Nate'}`;
};
