import React, { useState, useEffect } from 'react';
import { Table, Button, Input, notification } from 'antd';
import 'tailwindcss/tailwind.css';
import axios from 'axios';

const Inventory = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Festival Tickets', quantity: 100, category: 'Event' },
    { id: 2, name: 'Popcorn', quantity: 50, category: 'Food' },
  ]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Mock AI prediction
    axios.post('/api/ai/predict', { item: 'Tickets' })
      .then(res => {
        notification.success({
          message: 'AI Prediction',
          description: `Predicted need: ${res.data.predictedQuantity} tickets`,
        });
      });
  }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Action',
      key: 'action',
      render: (_, item) => (
        <Button
          onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 10 } : i))}
          className="bg-green-600 text-white"
          data-testid={`restock-button-${item.id}`}
        >
          Restock
        </Button>
      ),
    },
  ];

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Festival & Drive-In Inventory</h1>
      <Input
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 p-2 border rounded w-full max-w-md mx-auto"
        data-testid="search-input"
      />
      <Table
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        className="shadow-xl rounded-lg"
        data-testid="inventory-table"
      />
    </div>
  );
};

export default Inventory;
