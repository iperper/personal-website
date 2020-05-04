var express = require('express');
var router = express.Router();
var VisitorDB = require('../db/VisitorDB')

/* GET visitor count to each page. */
router.get('/visitor_count', async(req, res) => {
  let response = await VisitorDB.getVisitorCounts();
  res.status(200).json(response).end();
});

module.exports = router;