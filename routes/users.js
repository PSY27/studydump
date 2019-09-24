const express = require('express');

const router = express.Router();

/* GET users listing. */
router.get('/:id', (req, res) => {
  res.send('Responding to');
});

module.exports = router;
