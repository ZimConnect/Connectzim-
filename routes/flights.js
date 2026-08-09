const express = require('express');
const router = express.Router();

// Fake database for now
let flights = [
  {id: 1, title: "HRE to JNB", airline: "Airlink", price: 350, date: "2026-08-20"}
];

// GET all flights
router.get('/', (req, res) => {
  res.json(flights);
});

// POST new flight
router.post('/', (req, res) => {
  const flight = {id: Date.now(), ...req.body};
  flights.push(flight);
  res.json({success: true, flight});
});

module.exports = router;
