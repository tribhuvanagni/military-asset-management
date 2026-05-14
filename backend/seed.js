require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Asset = require('./models/Asset');
const Purchase = require('./models/Purchase');
const Transfer = require('./models/Transfer');
const Assignment = require('./models/Assignment');

const SALT_ROUNDS = 10;

async function clearDatabase() {
  await User.deleteMany({});
  await Asset.deleteMany({});
  await Purchase.deleteMany({});
  await Transfer.deleteMany({});
  await Assignment.deleteMany({});
  console.log('Cleared all existing collections');
}

async function seedUsers() {
  const users = [
    {
      username: 'admin',
      passwordHash: await bcrypt.hash('Admin@123', SALT_ROUNDS),
      role: 'admin',
      assignedBase: null
    },
    {
      username: 'cmd_alpha',
      passwordHash: await bcrypt.hash('Base@001', SALT_ROUNDS),
      role: 'commander',
      assignedBase: 'Alpha Base'
    },
    {
      username: 'log_bravo',
      passwordHash: await bcrypt.hash('Log@002', SALT_ROUNDS),
      role: 'logistics',
      assignedBase: 'Bravo Base'
    }
  ];

  const created = await User.insertMany(users);
  console.log(`Seeded ${created.length} users`);
  return created;
}

async function seedAssets() {
  const assets = [
    {
      name: 'M1 Abrams Tank',
      type: 'vehicle',
      base: 'Alpha Base',
      openingBalance: 12,
      closingBalance: 14,
      purchasedQty: 3,
      transferredIn: 0,
      transferredOut: 1,
      assignedQty: 0,
      expendedQty: 0,
      netMovement: 2
    },
    {
      name: 'AK-47 Rifle',
      type: 'weapon',
      base: 'Bravo Base',
      openingBalance: 200,
      closingBalance: 185,
      purchasedQty: 25,
      transferredIn: 10,
      transferredOut: 0,
      assignedQty: 50,
      expendedQty: 0,
      netMovement: -15
    },
    {
      name: '5.56mm Ammo',
      type: 'ammunition',
      base: 'Charlie Base',
      openingBalance: 10000,
      closingBalance: 8500,
      purchasedQty: 2000,
      transferredIn: 500,
      transferredOut: 1000,
      assignedQty: 2000,
      expendedQty: 1000,
      netMovement: -1500
    },
    {
      name: 'Humvee',
      type: 'vehicle',
      base: 'Bravo Base',
      openingBalance: 8,
      closingBalance: 10,
      purchasedQty: 3,
      transferredIn: 1,
      transferredOut: 0,
      assignedQty: 2,
      expendedQty: 0,
      netMovement: 2
    },
    {
      name: 'M4 Carbine',
      type: 'weapon',
      base: 'Alpha Base',
      openingBalance: 150,
      closingBalance: 145,
      purchasedQty: 10,
      transferredIn: 0,
      transferredOut: 5,
      assignedQty: 10,
      expendedQty: 0,
      netMovement: -5
    },
    {
      name: '7.62mm Ammo',
      type: 'ammunition',
      base: 'Alpha Base',
      openingBalance: 5000,
      closingBalance: 4200,
      purchasedQty: 1000,
      transferredIn: 200,
      transferredOut: 500,
      assignedQty: 1000,
      expendedQty: 500,
      netMovement: -800
    }
  ];

  const created = await Asset.insertMany(assets);
  console.log(`Seeded ${created.length} assets`);
  return created;
}

async function seedPurchases(users, assets) {
  const adminUser = users.find((u) => u.role === 'admin');
  const logUser = users.find((u) => u.role === 'logistics');

  const purchases = [
    {
      assetId: assets[0]._id,
      assetName: assets[0].name,
      assetType: assets[0].type,
      base: assets[0].base,
      quantity: 3,
      unitCost: 6200000,
      totalCost: 18600000,
      purchasedBy: adminUser._id,
      date: new Date('2025-03-15'),
      notes: 'Annual fleet expansion - approved by CENTCOM'
    },
    {
      assetId: assets[1]._id,
      assetName: assets[1].name,
      assetType: assets[1].type,
      base: assets[1].base,
      quantity: 25,
      unitCost: 700,
      totalCost: 17500,
      purchasedBy: logUser._id,
      date: new Date('2025-04-02'),
      notes: 'Replacement stock for training program'
    },
    {
      assetId: assets[2]._id,
      assetName: assets[2].name,
      assetType: assets[2].type,
      base: assets[2].base,
      quantity: 2000,
      unitCost: 0.35,
      totalCost: 700,
      purchasedBy: logUser._id,
      date: new Date('2025-04-10'),
      notes: 'Quarterly ammunition resupply'
    },
    {
      assetId: assets[3]._id,
      assetName: assets[3].name,
      assetType: assets[3].type,
      base: assets[3].base,
      quantity: 3,
      unitCost: 220000,
      totalCost: 660000,
      purchasedBy: adminUser._id,
      date: new Date('2025-02-20'),
      notes: 'Patrol vehicle procurement for Bravo Base'
    }
  ];

  const created = await Purchase.insertMany(purchases);
  console.log(`Seeded ${created.length} purchase records`);
  return created;
}

async function seedTransfers(users, assets) {
  const logUser = users.find((u) => u.role === 'logistics');
  const cmdUser = users.find((u) => u.role === 'commander');

  const transfers = [
    {
      assetId: assets[0]._id,
      assetName: assets[0].name,
      fromBase: 'Alpha Base',
      toBase: 'Charlie Base',
      quantity: 1,
      initiatedBy: logUser._id,
      approvedBy: cmdUser._id,
      status: 'approved',
      date: new Date('2025-03-20'),
      notes: 'Reinforcement for southern perimeter'
    },
    {
      assetId: assets[2]._id,
      assetName: assets[2].name,
      fromBase: 'Charlie Base',
      toBase: 'Alpha Base',
      quantity: 500,
      initiatedBy: logUser._id,
      status: 'pending',
      date: new Date('2025-04-15'),
      notes: 'Ammo redistribution - awaiting commander sign-off'
    },
    {
      assetId: assets[1]._id,
      assetName: assets[1].name,
      fromBase: 'Bravo Base',
      toBase: 'Alpha Base',
      quantity: 10,
      initiatedBy: logUser._id,
      approvedBy: cmdUser._id,
      status: 'approved',
      date: new Date('2025-04-01'),
      notes: 'Cross-base weapon redistribution'
    }
  ];

  const created = await Transfer.insertMany(transfers);
  console.log(`Seeded ${created.length} transfer records`);
  return created;
}

async function seedAssignments(users, assets) {
  const cmdUser = users.find((u) => u.role === 'commander');
  const adminUser = users.find((u) => u.role === 'admin');

  const assignments = [
    {
      assetId: assets[1]._id,
      assetName: assets[1].name,
      base: 'Bravo Base',
      assignedTo: 'Sgt. Marcus Rivera',
      quantity: 30,
      purpose: 'Perimeter defense rotation - Sector 7',
      expendedQty: 0,
      assignedBy: cmdUser._id,
      date: new Date('2025-04-05'),
      status: 'active'
    },
    {
      assetId: assets[2]._id,
      assetName: assets[2].name,
      base: 'Charlie Base',
      assignedTo: 'Lt. Sarah Chen',
      quantity: 2000,
      purpose: 'Live fire exercise - Range Delta',
      expendedQty: 1000,
      assignedBy: adminUser._id,
      date: new Date('2025-03-25'),
      status: 'active'
    },
    {
      assetId: assets[3]._id,
      assetName: assets[3].name,
      base: 'Bravo Base',
      assignedTo: 'Cpl. James Foster',
      quantity: 2,
      purpose: 'Convoy escort duty - Route Pegasus',
      expendedQty: 0,
      assignedBy: cmdUser._id,
      date: new Date('2025-04-12'),
      status: 'active'
    },
    {
      assetId: assets[1]._id,
      assetName: assets[1].name,
      base: 'Bravo Base',
      assignedTo: 'Pvt. Diana Morales',
      quantity: 20,
      purpose: 'Guard duty - Main gate',
      expendedQty: 0,
      assignedBy: cmdUser._id,
      date: new Date('2025-04-08'),
      returnDate: new Date('2025-04-20'),
      status: 'returned'
    }
  ];

  const created = await Assignment.insertMany(assignments);
  console.log(`Seeded ${created.length} assignment records`);
  return created;
}

async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    await clearDatabase();

    const users = await seedUsers();
    const assets = await seedAssets();
    await seedPurchases(users, assets);
    await seedTransfers(users, assets);
    await seedAssignments(users, assets);

    console.log('\nSeed complete - database populated with realistic military data');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

runSeed();
