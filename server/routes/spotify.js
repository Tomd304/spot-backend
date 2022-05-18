const express = require("express");
const router = express.Router();
const controller = require("../controllers/spotify_controller");

router.get("/checkSaved", controller.checkSaved);

router.put("/saveAlbum", controller.saveAlbum);

router.delete("/removeAlbum", controller.removeAlbum);

router.put("/saveTrack", controller.saveTrack);

router.delete("/removeTrack", controller.removeTrack);

module.exports = router;

// router.get("/getPlaylists", controller.getPlaylists);

// router.put("/createPlaylist", controller.createPlaylist);

// router.put("/addPlaylistTracks", controller.addPlaylistTracks);

// router.get("/getSavedAlbums", controller.getSavedAlbums);

// router.get("/getSavedTracks", controller.getSavedTracks);
