import React, { useEffect } from 'react';
import { Card } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { getSponsors } from '../../redux/sponsors/actions'; // Assuming this exists

const SponsorshipSummary = () => {
  const dispatch = useDispatch();
  const { sponsors, loading } = useSelector((state) => state.sponsors);

  useEffect(() => {
    dispatch(getSponsors());
  }, [dispatch]);

  return (
    <Card title="Sponsorship Summary" loading={loading}>
      <p>Total Sponsors: {sponsors.length}</p>
      <p>Recent Additions: {sponsors.filter(s => new Date(s.created) > new Date() - 7 * 24 * 60 * 60 * 1000).length}</p>
    </Card>
  );
};

export default SponsorshipSummary;
