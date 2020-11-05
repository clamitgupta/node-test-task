require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { Connection } = require('./connections.js');
const ObjectId = require('mongodb').ObjectID;

let client = null;
initConnections();

async function initConnections() {
  try {
    client = await Connection.connectToMongo(process.env.MONGO_URL);
  } catch (e) {
    console.log('Failed to connect to mongo');
    process.exit();
  }
}


app.get('/', async (req, res) => {
  // test database selected
  const db = client.db('test');

  // Importing users data from json file if no records found
  const userData = await db.collection("users").countDocuments();
  if (!userData) {
    const user = require('./users.json');
    await db.collection("users").insertMany(user);
  }

  // Importing products data from json file if no records found
  const productData = await db.collection("products").countDocuments();
  if (!productData) {
    const product = require('./products.json');
    await db.collection("products").insertMany(product);
  }

  // Importing product views data data using above records
  const users = await db.collection("users").find().toArray();
  const product = await db.collection("products").find().toArray();

  for (const x of users) {
    for (const y of product) {
      const obj = {
        userId: x._id,
        productId: y._id,
        viewDate: randomDate(new Date(2020, 9, 1), new Date())
      };
      await db.collection("userView").insertOne(obj);
    }
  }

  // Validate Product ID
  if (!req.query.id) {
    return res.status(400).send({
      success: false,
      message: 'Product id is required.'
    });
  }

  // Validate Filter value
  if (req.query.filter && ['d', 'w', 'm'].indexOf(req.query.filter) === -1) {
    return res.status(400).send({
      success: false,
      message: 'Invalid filter. Please use d,w or m.'
    });
  }

  // Check Product ID if exists in products table
  try {
    const rec = await db.collection("products").find({ _id: ObjectId(req.query.id) }).toArray();

    if (!rec.length) {
      return res.status(404).send({
        success: false,
        message: 'Invalid product id.'
      });
    }
  } catch (e) {
    return res.status(404).send({
      success: false,
      message: 'Invalid product id.'
    });
  }

  const filter = req.query.filter || 'd';
  let totalUsers = [];
  let uniqueUsers = [];
  let ourDate = new Date();
  let pastDate = null;

  switch (filter) {
    // Getting total users count and unique users count on daily basis
    case 'd':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      pastDate = ourDate.getDate() + 1;
      ourDate.setDate(pastDate);
      totalUsers = await db.collection("userView").find({ viewDate: { $gte: today, $lt: ourDate }, productId: ObjectId(req.query.id) }).count();
      uniqueUsers = await db.collection("userView").distinct('userId', { viewDate: { $gte: today, $lt: ourDate }, productId: ObjectId(req.query.id) });
      break;

    // Getting total users and total unique users on weekly basis
    case 'w':
      pastDate = ourDate.getDate() - 7;
      ourDate.setDate(pastDate);
      totalUsers = await db.collection("userView").find({ viewDate: { $lte: new Date(), $gte: ourDate }, productId: ObjectId(req.query.id) }).count();
      uniqueUsers = await db.collection("userView").distinct('userId', { viewDate: { $lte: new Date(), $gte: ourDate }, productId: ObjectId(req.query.id) });
      break;

    // Getting total users and total unique users on monthly basis
    case 'm':
      pastDate = ourDate.setMonth(ourDate.getMonth() - 1);
      ourDate.setDate(pastDate);
      totalUsers = await db.collection("userView").find({ viewDate: { $lte: new Date(), $gte: ourDate }, productId: ObjectId(req.query.id) }).count();
      uniqueUsers = await db.collection("userView").distinct('userId', { viewDate: { $lte: new Date(), $gte: ourDate }, productId: ObjectId(req.query.id) });
      break;
  }

  return res.status(200).send({
    totalUsers,
    uniqueUsers: uniqueUsers.length
  });
})

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})