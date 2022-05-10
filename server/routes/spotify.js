const express = require("express");
var router = express.Router();
var controller = require("../controllers/spotify_controller");

router.get("/getSavedAlbums", controller.getSavedAlbums);

// router.get("/getPlaylists", controller.getPlaylists);

router.put("/saveAlbum", controller.saveAlbum);

router.delete("/removeAlbum", controller.removeAlbum);

// router.put("/createPlaylist", controller.createPlaylist);

// router.put("/addPlaylistTracks", controller.addPlaylistTracks);

module.exports = router;
