const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Asset = require('../models/Asset');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// POST /api/purchases - record a new asset purchase
router.post(
  '/',
  requireRole('admin', 'logistics'),
  [
    body('assetId').notEmpty().withMessage('Asset selection is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Purchase quantity must be at least 1'),
    body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
    body('date').optional().isISO8601().withMessage('Date must be in valid format')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { assetId, quantity, unitCost, date, notes } = req.body;

      const asset = await Asset.findById(assetId);
      if (!asset) {
        return res.status(404).json({ error: 'Selected asset does not exist in inventory' });
      }

      const totalCost = quantity * unitCost;

      const purchase = new Purchase({
        assetId: asset._id,
        assetName: asset.name,
        assetType: asset.type,
        base: asset.base,
        quantity,
        unitCost,
        totalCost,
        purchasedBy: req.user.userId,
        date: date || new Date(),
        notes: notes || ''
      });

      await purchase.save();

      // Update asset balances - purchases increase the closing balance
      asset.purchasedQty += quantity;
      asset.closingBalance += quantity;
      await asset.save();

      res.status(201).json({ purchase, updatedAsset: asset });
    } catch (err) {
      console.error('Purchase recording failed:', err.message);
      res.status(500).json({ error: 'Could not record purchase - please try again' });
    }
  }
);

// GET /api/purchases - list all purchases with optional filters
router.get('/', async (req, res) => {
  try {
    const { base, type, startDate, endDate } = req.query;
    const filter = {};

    if (base) filter.base = base;
    if (type) filter.assetType = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(filter)
      .populate('purchasedBy', 'username role')
      .sort({ date: -1 });

    res.json({ purchases });
  } catch (err) {
    console.error('Purchase listing failed:', err.message);
    res.status(500).json({ error: 'Could not retrieve purchase records' });
  }
});

module.exports = router;
