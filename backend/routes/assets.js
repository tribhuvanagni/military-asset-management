const express = require('express');
const Asset = require('../models/Asset');
const Purchase = require('../models/Purchase');
const Transfer = require('../models/Transfer');
const Assignment = require('../models/Assignment');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// All asset routes require authentication
router.use(verifyToken);

// GET /api/assets - list assets with optional filters
router.get('/', async (req, res) => {
  try {
    const { base, type, startDate, endDate } = req.query;
    const filter = {};

    if (base) filter.base = base;
    if (type) filter.type = type;

    // Date filtering applies to the asset's last update
    if (startDate || endDate) {
      filter.updatedAt = {};
      if (startDate) filter.updatedAt.$gte = new Date(startDate);
      if (endDate) filter.updatedAt.$lte = new Date(endDate);
    }

    // Commanders only see their own base's assets
    if (req.user.role === 'commander' && req.user.base) {
      filter.base = req.user.base;
    }

    const assets = await Asset.find(filter).sort({ base: 1, name: 1 });

    // Aggregate summary stats for the dashboard cards
    const totalAssets = assets.length;
    const pendingTransfers = await Transfer.countDocuments({ status: 'pending' });
    const activeAssignments = await Assignment.countDocuments({ status: 'active' });

    // Purchases this period (use date filters if provided, else all-time)
    const purchaseFilter = {};
    if (startDate || endDate) {
      purchaseFilter.date = {};
      if (startDate) purchaseFilter.date.$gte = new Date(startDate);
      if (endDate) purchaseFilter.date.$lte = new Date(endDate);
    }
    const totalPurchases = await Purchase.countDocuments(purchaseFilter);

    res.json({
      assets,
      summary: {
        totalAssets,
        totalPurchases,
        pendingTransfers,
        activeAssignments
      }
    });
  } catch (err) {
    console.error('Asset listing failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve asset inventory' });
  }
});

// GET /api/assets/:id/movements - detailed breakdown for the net movement modal
router.get('/:id/movements', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found in inventory' });
    }

    // Pull related transaction records
    const purchases = await Purchase.find({ assetId: asset._id }).sort({ date: -1 });
    const transfersIn = await Transfer.find({
      assetName: asset.name,
      toBase: asset.base,
      status: 'approved'
    }).sort({ date: -1 });
    const transfersOut = await Transfer.find({
      assetId: asset._id,
      fromBase: asset.base,
      status: 'approved'
    }).sort({ date: -1 });
    const assignments = await Assignment.find({ assetId: asset._id }).sort({ date: -1 });

    res.json({
      asset: {
        name: asset.name,
        type: asset.type,
        base: asset.base,
        openingBalance: asset.openingBalance,
        closingBalance: asset.closingBalance,
        netMovement: asset.netMovement
      },
      movements: {
        purchases: purchases.map((p) => ({
          date: p.date,
          quantity: p.quantity,
          totalCost: p.totalCost,
          notes: p.notes
        })),
        transfersIn: transfersIn.map((t) => ({
          date: t.date,
          quantity: t.quantity,
          fromBase: t.fromBase,
          notes: t.notes
        })),
        transfersOut: transfersOut.map((t) => ({
          date: t.date,
          quantity: t.quantity,
          toBase: t.toBase,
          notes: t.notes
        })),
        assignments: assignments.map((a) => ({
          date: a.date,
          quantity: a.quantity,
          assignedTo: a.assignedTo,
          purpose: a.purpose,
          expendedQty: a.expendedQty,
          status: a.status
        }))
      }
    });
  } catch (err) {
    console.error('Movement breakdown failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve asset movement data' });
  }
});

module.exports = router;
