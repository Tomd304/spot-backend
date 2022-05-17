const express = require("express");
var router = express.Router();
var controller = require("../controllers/spotify_controller");

router.get("/getSavedAlbums", controller.getSavedAlbums);

router.put("/saveAlbum", controller.saveAlbum);

router.delete("/removeAlbum", controller.removeAlbum);

// router.get("/getPlaylists", controller.getPlaylists);

// router.put("/createPlaylist", controller.createPlaylist);

// router.put("/addPlaylistTracks", controller.addPlaylistTracks);

router.get("/getSavedTracks", controller.getSavedTracks);

router.put("/saveTrack", controller.saveTrack);

router.delete("/removeTrack", controller.removeTrack);

module.exports = router;
