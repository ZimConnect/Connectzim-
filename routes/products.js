const express = require('express');
const router = express.Router();

let products = [
  {id: 1, name: "Street Gear Hoodie", price: 25},
  {id: 2, name: "ZimConnect Cap", price: 10}
];

router.get('/', (req, res) => {
  res.json(products);
});

module.exports = router;
