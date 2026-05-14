const express = require('express');
const { body, validationResult } = require('express-validator');
const Transfer = require('../models/Transfer');
const Asset = require('../models/Asset');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// POST /api/transfers - initiate a new transfer (pending approval)
router.post(
  '/',
  requireRole('admin', 'logistics'),
  [
    body('assetId').notEmpty().withMessage('Asset selection is required'),
    body('toBase').notEmpty().withMessage('Destination base is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Transfer quantity must be at least 1')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { assetId, toBase, quantity, notes } = req.body;

      const sourceAsset = await Asset.findById(assetId);
      if (!sourceAsset) {
        return res.status(404).json({ error: 'Source asset not found in inventory' });
      }

      if (sourceAsset.base === toBase) {
        return res.status(400).json({ error: 'Cannot transfer an asset to the same base it is already at' });
      }

      // Pre-check balance before even creating the pending transfer
      if (sourceAsset.closingBalance < quantity) {
        return res.status(400).json({
          error: `Insufficient quantity at ${sourceAsset.base} - available: ${sourceAsset.closingBalance}, requested: ${quantity}`
        });
      }

      const transfer = new Transfer({
        assetId: sourceAsset._id,
        assetName: sourceAsset.name,
        fromBase: sourceAsset.base,
        toBase,
        quantity,
        initiatedBy: req.user.userId,
        status: 'pending',
        date: new Date(),
        notes: notes || ''
      });

      await transfer.save();
      res.status(201).json({ transfer });
    } catch (err) {
      console.error('Transfer initiation failed:', err.message);
      res.status(500).json({ error: 'Could not initiate transfer request' });
    }
  }
);

// PUT /api/transfers/:id/approve - approve a pending transfer
router.put(
  '/:id/approve',
  requireRole('admin', 'commander'),
  async (req, res) => {
    try {
      const transfer = await Transfer.findById(req.params.id);
      if (!transfer) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ error: `Transfer already ${transfer.status} - cannot approve` });
      }

      // Verify source asset still has enough stock
      const sourceAsset = await Asset.findById(transfer.assetId);
      if (!sourceAsset) {
        return res.status(404).json({ error: 'Source asset no longer exists in inventory' });
      }

      if (sourceAsset.closingBalance < transfer.quantity) {
        return res.status(400).json({
          error: `Insufficient asset quantity at ${transfer.fromBase} for this transfer - available: ${sourceAsset.closingBalance}, required: ${transfer.quantity}`
        });
      }

      // Find or create the destination asset record
      let destAsset = await Asset.findOne({
        name: sourceAsset.name,
        type: sourceAsset.type,
        base: transfer.toBase
      });

      if (!destAsset) {
        destAsset = new Asset({
          name: sourceAsset.name,
          type: sourceAsset.type,
          base: transfer.toBase,
          openingBalance: 0,
          closingBalance: 0,
          purchasedQty: 0,
          transferredIn: 0,
          transferredOut: 0,
          assignedQty: 0,
          expendedQty: 0
        });
      }

      // Deduct from source
      sourceAsset.closingBalance -= transfer.quantity;
      sourceAsset.transferredOut += transfer.quantity;
      await sourceAsset.save();

      // Add to destination
      destAsset.closingBalance += transfer.quantity;
      destAsset.transferredIn += transfer.quantity;
      await destAsset.save();

      // Mark transfer as approved
      transfer.status = 'approved';
      transfer.approvedBy = req.user.userId;
      await transfer.save();

      res.json({ transfer, sourceAsset, destAsset });
    } catch (err) {
      console.error('Transfer approval failed:', err.message);
      res.status(500).json({ error: 'Could not process transfer approval' });
    }
  }
);

// PUT /api/transfers/:id/reject - reject a pending transfer
router.put(
  '/:id/reject',
  requireRole('admin', 'commander'),
  async (req, res) => {
    try {
      const transfer = await Transfer.findById(req.params.id);
      if (!transfer) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ error: `Transfer already ${transfer.status} - cannot reject` });
      }

      transfer.status = 'rejected';
      transfer.approvedBy = req.user.userId;
      await transfer.save();

      res.json({ transfer });
    } catch (err) {
      console.error('Transfer rejection failed:', err.message);
      res.status(500).json({ error: 'Could not process transfer rejection' });
    }
  }
);

// GET /api/transfers - list all transfers with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, base, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (base) {
      filter.$or = [{ fromBase: base }, { toBase: base }];
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transfers = await Transfer.find(filter)
      .populate('initiatedBy', 'username role')
      .populate('approvedBy', 'username role')
      .sort({ date: -1 });

    res.json({ transfers });
  } catch (err) {
    console.error('Transfer listing failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve transfer records' });
  }
});

module.exports = router;
