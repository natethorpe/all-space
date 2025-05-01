import React, { useEffect } from 'react';
import { Table } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { getSponsors } from '../../../redux/sponsors/actions';

const RecentTable = () => {
  const dispatch = useDispatch();
  const { sponsors } = useSelector((state) => state.sponsors);

  useEffect(() => {
    dispatch(getSponsors());
  }, [dispatch]);

  const columns = [
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
  ];

  const data = sponsors.slice(0, 5).map((sponsor) => ({
    key: sponsor._id,
    action: `Added sponsor: ${sponsor.name}`,
    date: new Date(sponsor.created).toLocaleDateString(),
  }));

  return <Table columns={columns} dataSource={data} pagination={false} />;
};

export default RecentTable;
