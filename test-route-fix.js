// Simple test to verify route ordering fix
const express = require('express');

// Mock the fee controller
class MockFeeController {
  getFeeStatistics = (req, res) => {
    res.json({
      success: true,
      data: [
        { _id: 'pending', count: 5, totalAmount: 5000 },
        { _id: 'paid', count: 10, totalAmount: 15000 }
      ]
    });
  };

  getFeeById = (req, res) => {
    res.json({
      success: true,
      data: { id: req.params.id, message: 'This is a fee by ID' }
    });
  };
}

const app = express();
const router = express.Router();
const feeController = new MockFeeController();

// Simulate the validation middleware that was causing the issue
const validateParams = (schema) => {
  return (req, res, next) => {
    const id = req.params.id;
    // Mock validation: check if id is 24 char hex string (MongoDB ObjectId format)
    if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: '"id" must only contain hexadecimal characters'
      });
    }
    next();
  };
};

const mockObjectIdSchema = {}; // Mock schema

// Test the FIXED route ordering (statistics BEFORE :id)
router.get('/statistics', feeController.getFeeStatistics);
router.get('/:id', validateParams(mockObjectIdSchema), feeController.getFeeById);

app.use('/api/fees', router);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Testing route fix...\n');
  
  // Test the fixed endpoint
  const http = require('http');
  
  const testRequest = (path, expectSuccess) => {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${PORT}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const response = JSON.parse(data);
          console.log(`GET ${path}`);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${JSON.stringify(response, null, 2)}`);
          console.log(`Expected success: ${expectSuccess}, Actual success: ${response.success}`);
          console.log('---\n');
          resolve(response);
        });
      });
      req.on('error', (err) => {
        console.error(`Error testing ${path}:`, err.message);
        resolve(null);
      });
    });
  };
  
  // Wait a bit for server to start, then run tests
  setTimeout(async () => {
    console.log('Testing /api/fees/statistics (should work now):');
    await testRequest('/api/fees/statistics', true);
    
    console.log('Testing /api/fees/invalidhex (should fail validation):');
    await testRequest('/api/fees/invalidhex', false);
    
    console.log('Testing /api/fees/507f1f77bcf86cd799439011 (valid ObjectId):');
    await testRequest('/api/fees/507f1f77bcf86cd799439011', true);
    
    process.exit(0);
  }, 100);
});
