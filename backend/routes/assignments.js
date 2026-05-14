const express = require('express');
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// POST /api/assignments - record a new asset assignment
router.post(
  '/',
  requireRole('admin', 'commander'),
  [
    body('assetId').notEmpty().withMessage('Asset selection is required'),
    body('assignedTo').trim().notEmpty().withMessage('Personnel name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Assignment quantity must be at least 1'),
    body('purpose').trim().notEmpty().withMessage('Assignment purpose is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { assetId, assignedTo, quantity, purpose, date } = req.body;

      const asset = await Asset.findById(assetId);
      if (!asset) {
        return res.status(404).json({ error: 'Selected asset not found in inventory' });
      }

      if (asset.closingBalance < quantity) {
        return res.status(400).json({
          error: `Insufficient quantity at ${asset.base} - available: ${asset.closingBalance}, requested: ${quantity}`
        });
      }

      const assignment = new Assignment({
        assetId: asset._id,
        assetName: asset.name,
        base: asset.base,
        assignedTo,
        quantity,
        purpose,
        assignedBy: req.user.userId,
        date: date || new Date(),
        status: 'active'
      });

      await assignment.save();

      // Deduct from asset balance
      asset.assignedQty += quantity;
      asset.closingBalance -= quantity;
      await asset.save();

      res.status(201).json({ assignment, updatedAsset: asset });
    } catch (err) {
      console.error('Assignment recording failed:', err.message);
      res.status(500).json({ error: 'Could not record assignment' });
    }
  }
);

// PUT /api/assignments/:id/expend - record expenditure against an assignment
router.put(
  '/:id/expend',
  requireRole('admin', 'commander'),
  async (req, res) => {
    try {
      const { expendedQty } = req.body;

      if (!expendedQty || expendedQty < 1) {
        return res.status(400).json({ error: 'Expended quantity must be at least 1' });
      }

      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment record not found' });
      }

      if (assignment.status !== 'active') {
        return res.status(400).json({ error: `Cannot record expenditure on a ${assignment.status} assignment` });
      }

      const remainingAssigned = assignment.quantity - assignment.expendedQty;
      if (expendedQty > remainingAssigned) {
        return res.status(400).json({
          error: `Cannot expend ${expendedQty} - only ${remainingAssigned} units remain on this assignment`
        });
      }

      assignment.expendedQty += expendedQty;

      // If everything is expended, mark the assignment as fully expended
      if (assignment.expendedQty >= assignment.quantity) {
        assignment.status = 'expended';
      }

      await assignment.save();

      // Update the asset's expended quantity
      const asset = await Asset.findById(assignment.assetId);
      if (asset) {
        asset.expendedQty += expendedQty;
        await asset.save();
      }

      res.json({ assignment });
    } catch (err) {
      console.error('Expenditure recording failed:', err.message);
      res.status(500).json({ error: 'Could not record expenditure' });
    }
  }
);

// PUT /api/assignments/:id/return - mark assignment as returned
router.put(
  '/:id/return',
  requireRole('admin', 'commander'),
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment record not found' });
      }

      if (assignment.status !== 'active') {
        return res.status(400).json({ error: `Cannot return a ${assignment.status} assignment` });
      }

      const returnedQty = assignment.quantity - assignment.expendedQty;

      assignment.status = 'returned';
      assignment.returnDate = new Date();
      await assignment.save();

      // Return unexpended quantity back to asset balance
      if (returnedQty > 0) {
        const asset = await Asset.findById(assignment.assetId);
        if (asset) {
          asset.closingBalance += returnedQty;
          asset.assignedQty -= returnedQty;
          await asset.save();
        }
      }

      res.json({ assignment });
    } catch (err) {
      console.error('Assignment return failed:', err.message);
      res.status(500).json({ error: 'Could not process assignment return' });
    }
  }
);

// GET /api/assignments - list all assignments with optional filters
router.get('/', async (req, res) => {
  try {
    const { base, status, startDate, endDate } = req.query;
    const filter = {};

    if (base) filter.base = base;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const assignments = await Assignment.find(filter)
      .populate('assignedBy', 'username role')
      .sort({ date: -1 });

    res.json({ assignments });
  } catch (err) {
    console.error('Assignment listing failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve assignment records' });
  }
});

module.exports = router;
