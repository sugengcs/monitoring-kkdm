const express = require('express');
const router = express.Router();

// In-memory storage for Monitoring SPM data (in production, this should be a database)
let monitoringSPMData = {
  data: [],
  categories: [],
  jalurOptions: [],
  groups: []
};

// Get all Monitoring SPM data
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: monitoringSPMData.data
  });
});

// Get categories
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: monitoringSPMData.categories
  });
});

// Get jalur options
router.get('/jalur-options', (req, res) => {
  res.json({
    success: true,
    data: monitoringSPMData.jalurOptions
  });
});

// Get groups
router.get('/groups', (req, res) => {
  res.json({
    success: true,
    data: monitoringSPMData.groups
  });
});

// Update Monitoring SPM data (called when frontend localStorage changes)
router.post('/sync', (req, res) => {
  const { data, categories, jalurOptions, groups } = req.body;
  
  if (data) monitoringSPMData.data = data;
  if (categories) monitoringSPMData.categories = categories;
  if (jalurOptions) monitoringSPMData.jalurOptions = jalurOptions;
  if (groups) monitoringSPMData.groups = groups;
  
  res.json({
    success: true,
    message: 'Monitoring SPM data synced successfully'
  });
});

module.exports = router;
