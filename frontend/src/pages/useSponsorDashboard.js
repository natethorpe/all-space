import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadSponsors, loadSummary } from '@/redux/sponsors/actions';

export default function useSponsorDashboard() {
  const dispatch = useDispatch();
  const reduxState = useSelector(state => {
    console.log('useSelector: Full Redux state:', state);
    return state.sponsors || {};
  });
  const { items = [], summary = {}, loading = false, error, total = 0 } = reduxState;

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [sponsorData, setSponsorData] = useState({ name: '', tier_level: '', likeliness: '', est_cost: '', assignedTo: '', image: '' });
  const [tierOptions] = useState(['Very High', 'High', 'Moderate-High']);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchSponsors = async () => {
    try {
      const response = await dispatch(loadSponsors({ 
        page: currentPage, 
        items: itemsPerPage, 
        q: searchTerm, 
        tier: tierFilter 
      })).unwrap();
      console.log('useSponsorDashboard: Sponsors fetched:', response.result);
      // No setFilteredSponsors—Redux items updates via reducer
    } catch (err) {
      console.error('useSponsorDashboard: loadSponsors failed:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await dispatch(loadSummary()).unwrap();
      console.log('useSponsorDashboard: Summary fetched:', response.result);
    } catch (err) {
      console.error('useSponsorDashboard: loadSummary failed:', err);
    }
  };

  const refreshSponsors = () => {
    fetchSponsors();
    fetchSummary();
  };

  useEffect(() => {
    refreshSponsors();
  }, [dispatch, currentPage, searchTerm, tierFilter]);

  console.log('useSponsorDashboard: Returning state:', { items, summary, loading, total });

  return {
    filteredSponsors: items, // Use Redux items directly
    summary,
    loading,
    error,
    total,
    addModalVisible,
    setAddModalVisible,
    sponsorData,
    setSponsorData,
    tierOptions,
    searchTerm,
    setSearchTerm,
    tierFilter,
    setTierFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    refreshSponsors,
  };
};

/*
 * File: useSponsorDashboard.js
 * Path: frontend/src/hooks/useSponsorDashboard.js
 * Purpose: Manages sponsor data and state for Dashboard
 * Dependencies:
 *  - react, react-redux: Hooks and state management
 *  - redux/sponsors/actions: loadSponsors, loadSummary
 * Depends On:
 *  - redux/sponsors/reducer.js: Updates state.sponsors
 * Used By:
 *  - Dashboard.jsx: Consumes data and methods
 * Why It Exists:
 *  - Centralizes sponsor data logic
 * How It Works:
 *  - Fetches sponsors and summary from Redux
 *  - Manages filtering, pagination, and modal state
 * Change Log:
 *  - 04/07/2025: Updated to handle filteredSponsors locally
 *  - Today: Added state defaults, refreshSponsors triggers both fetches
 * Future Enhancements:
 *  - Add debounced search
 *  - Cache results with SWR
 */
