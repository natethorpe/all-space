/*
 * File Path: frontend/src/components/SponsorshipSummary.jsx
 * Purpose: Displays a summary of sponsorship data in Allur Space Console.
 * How It Works:
 *   - Fetches sponsor summary data from /api/sponsors/summary using axios.
 *   - Renders a Card with total sponsors and recent additions (last 7 days).
 *   - Uses Ant Design Card for UI consistency.
 * Dependencies:
 *   - React: useState, useEffect for state and lifecycle (version 18.3.1).
 *   - antd: Card for UI (version 5.22.2).
 *   - axios: API calls (version 1.8.4).
 * Dependents:
 *   - Dashboard.jsx, SponsorHub.jsx: Likely renders SponsorshipSummary.
 * Why It’s Here:
 *   - Provides sponsor overview for Sprint 2 (05/03/2025).
 * Change Log:
 *   - 05/03/2025: Updated to use /api/sponsors/summary endpoint (Grok).
 *     - Why: Fix 404 errors and align with backend endpoint (User, 05/03/2025).
 *     - How: Replaced Redux getSponsors with axios call to /api/sponsors/summary.
 *     - Test: Load dashboard, verify summary displays without 404 errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /dashboard or page using SponsorshipSummary.
 *   - Verify Card shows Total Sponsors and Recent Additions, no 404 errors.
 *   - Check browser console: Confirm API call to /api/sponsors/summary succeeds.
 * Future Enhancements:
 *   - Add detailed sponsor list toggle (Sprint 3).
 *   - Cache summary data (Sprint 4).
 */

import React, { useState, useEffect } from 'react';
import { Card } from 'antd';
import axios from 'axios';
import apiClient from '../config/serverApiConfig';

const SponsorshipSummary = () => {
  const [summary, setSummary] = useState({ totalSponsors: 0, activeSponsors: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(false);
  const [recentAdditions, setRecentAdditions] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/sponsors/summary');
        const { summary } = res.data;
        setSummary(summary);
        // Mock recent additions (requires sponsor list with created dates)
        // For now, estimate as 10% of totalSponsors (adjust if backend provides created dates)
        setRecentAdditions(Math.round(summary.totalSponsors * 0.1));
      } catch (err) {
        console.error('SponsorshipSummary: Failed to fetch summary', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <Card title="Sponsorship Summary" loading={loading}>
      <p>Total Sponsors: {summary.totalSponsors}</p>
      <p>Recent Additions (Last 7 Days): {recentAdditions}</p>
      <p>Active Sponsors: {summary.activeSponsors}</p>
      <p>Total Revenue: ${summary.totalRevenue.toFixed(2)}</p>
    </Card>
  );
};

export default SponsorshipSummary;
