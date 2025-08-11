const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));
app.use(express.json());

// Simple dummy table for representation
const dummyTable = [
  { id: 1, name: 'John', age: 25, city: 'New York' },
  { id: 2, name: 'Jane', age: 30, city: 'Los Angeles' },
  { id: 3, name: 'Bob', age: 35, city: 'Chicago' }
];

// API endpoint to execute SQL queries (just returns dummy data for now)
app.post('/api/execute-query', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    });
  }
  
  console.log(`Query received: ${query}`);
  
  // Just return the dummy table for any query
  res.json({
    success: true,
    data: dummyTable,
    rowCount: dummyTable.length,
    query: query,
    message: "This is dummy data for representation"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dummy data ready for testing`);
  console.log(`🔍 Try writing any SQL query - it will return sample data`);
});

module.exports = app;