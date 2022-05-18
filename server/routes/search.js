const express = require("express");
const router = express.Router();
const controller = require("../controllers/search_controller");

router.get("/getItems", controller.getItems);

module.exports = router;
