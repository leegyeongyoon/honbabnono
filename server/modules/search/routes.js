const express = require('express');
const router = express.Router();
const searchController = require('./controller');

// 주소/장소 검색 (카카오 API 프록시)
router.get('/address', searchController.searchAddress);

module.exports = router;
