const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const iconv = require('iconv-lite');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

const csvFolder = path.join(__dirname, 'csv');

const csvFiles = {
  DynamicMarketShare: 'DynamicMarketShare.csv',
  ShareBars: 'ShareBars.csv',
  ShareTrend: 'ShareTrend.csv'
};

const csvHeaders = {
  DynamicMarketShare: ['Company', 'Metric Selector', 'Channel', 'Metric Selector Share', 'Metric Selector Share along Distribution By'],
  ShareBars: ['Company', 'NBRx Share', 'Paid TRx', 'Written TRx','Projected TRx'],
  ShareTrend: [
    'Company','Metric Selector','JUL-23','Aug-23','Sep-23','Oct-23','Nov-23','Dec-23',
    'Jan-24','Feb-24','Mar-24','Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24',
    'Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25'
  ]
};

function parseCsv(filePath, headers) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf16le'))
      .pipe(csvParser({
        separator: '\t',
        skipEmptyLines: true,
        skipLines: 1,
        headers: headers,
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function parseCsvByName(csvName) {
    if (!csvFiles[csvName]) {
      throw new Error(`CSV "${csvName}" not found`);
    }
    const filePath = path.join(csvFolder, csvFiles[csvName]);
    const headers = csvHeaders[csvName];
    return parseCsv(filePath, headers);
  }

// Generic API for SQL-like table names
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ success: false, error: 'SQL string required' });
  }

  // Extract table name from query
  const match = sql.match(/from\s+(\w+)/i);
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid SQL format' });
  }
  const tableName = match[1];

  if (!csvFiles[tableName]) {
    return res.status(404).json({ success: false, error: `Unknown table: ${tableName}` });
  }

  try {
    const filePath = path.join(csvFolder, csvFiles[tableName]);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const data = await parseCsv(filePath, csvHeaders[tableName]);
    res.json({ success: true, data, rowCount: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/calculate', async (req, res) => {
    try {
      const { logic, existingVariables, variableName } = req.body;
      if (!logic || !variableName) {
        return res.status(400).json({ message: 'Missing logic or variableName' });
      }
  
      const variables = existingVariables || {};
  
      try {
        // ✅ Just make cal async so we can use await in logic
        const funcString = "async function cal(parseCsv) { " + logic + " }";
        eval(funcString); // Defines async function cal
  
        // ✅ Await its execution
        var result = await cal(parseCsvByName);
  
        res.json({ value: result, success: true });
      } catch (err) {
        return res.status(400).json({ message: 'Error evaluating logic: ' + err.message });
      }
  
    } catch (err) {
      res.status(500).json({ message: err.message, success: false });
    }
  });

// app.post('/api/calculate', (req, res) => {
//   try {
//     const { logic, existingVariables, variableName } = req.body;
//     if (!logic || !variableName) {
//       return res.status(400).json({ message: 'Missing logic or variableName' });
//     }
//     // For the eval scope
//     const data = [10,20,30,40,50,60,70,80,90];
//     const variables = existingVariables || {};
        
//     try {
//         const funcString = "function cal(data) { "+logic+"}";
//         eval(funcString); // Defines the function
//         var result=cal(data)
//       // e.g. "data.map(x => x*2)"
//     } catch (err) {
//       return res.status(400).json({ message: 'Error evaluating logic: ' + err.message });
//     }
//     // You could store result on your server here if you want persistence across reloads
//     res.json({ value: result, success: true });
//   } catch (err) {
//     res.status(500).json({ message: err.message, success: false });
//   }
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
