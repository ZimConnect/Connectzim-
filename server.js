const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/flights', require('./routes/flights'));
app.use('/api/products', require('./routes/products'));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`ZimConnect running on ${PORT}`));
