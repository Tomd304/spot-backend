const request = require("request");
const axios = require("axios");

exports.getSavedAlbums = async (req, res) => {
  console.log("Getting auth");
  let Authorization = req.headers.authorization;
  console.log("Auth is: " + Authorization);
  let url = "https://api.spotify.com/v1/me/albums";
  let qs = {
    limit: 50,
    offset: 0,
  };

  const options = {
    url,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: Authorization,
    },
    params: qs,
  };

  let fullResponse;
  try {
    fullResponse = await axios(options);
  } catch (err) {
    if (err.response.status == 401) {
      console.log(err.message);
      res.sendStatus(err.response.status);
      return;
    }
  }
  let responseData = fullResponse.data.items;
  console.log(fullResponse.status);
  let total = fullResponse.data.total;
  console.log("total: " + total);
  qs.offset = 50;
  let repeats = Math.ceil((total - 50) / 50);
  let ids = responseData.map((i) => i.album.id);
  if (total > 50) {
    let requests = [];
    for (let i = 1; i <= repeats; i++) {
      requests.push(axios(options));
      qs.offset += 50;
    }

    const pRes = await Promise.all(requests);
    const data = pRes.map((i) => i.data.items.map((j) => j.album.id));
    ids = [...ids, ...data.flat(2)];
  }
  res.json({
    results: ids,
  });
};

// exports.getPlaylists = async (req, res) => {
//   let url = "https://api.spotify.com/v1/me/playlists";
//   let qs = {
//     limit: 50,
//     offset: 0,
//   };
//   let options = {
//     url,
//     method: "get",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + globalVal.access_token,
//     },
//     qs,
//   };
//   let response = JSON.parse(await requestPromise(options));
//   let total = response.total;
//   qs.offset = 50;
//   let playlists = response.items.map((i) => {
//     return { name: i.name, id: i.id };
//   });
//   while (total > qs.offset) {
//     response = JSON.parse(await requestPromise(options));
//     playlists.push(
//       ...response.items.map((i) => {
//         return { name: i.name, id: i.id };
//       })
//     );
//     qs.offset += 50;
//   }
//   res.json({
//     results: playlists,
//   });
// };

// exports.createPlaylist = async (req, res) => {
//   let url = "https://api.spotify.com/v1/me";
//   let options = {
//     url,
//     method: "get",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + globalVal.access_token,
//     },
//   };
//   let response = JSON.parse(await requestPromise(options));
//   let user_id = response.id;

//   url = "https://api.spotify.com/v1/users/" + user_id + "/playlists";
//   options = {
//     url,
//     method: "post",
//     headers: {
//       Authorization: "Bearer " + globalVal.access_token,
//     },
//     body: { name: "FRESH_ALERTS", public: true },
//     json: true,
//   };
//   response = await requestPromise(options);
//   res.json({ id: response.id });
// };

// exports.addPlaylistTracks = async (req, res) => {
//   let url =
//     " 	https://api.spotify.com/v1/playlists/" +
//     req.query.playlist_id +
//     "/tracks";

//   let options = {
//     url,
//     method: "post",
//     headers: {
//       Authorization: "Bearer " + globalVal.access_token,
//     },
//     body: { uris: req.query.track_uris.split(",") },
//     json: true,
//   };
//   let response = await requestPromise(options);
// };

exports.saveAlbum = async (req, res) => {
  let Authorization = req.headers.authorization;
  const ids = req.query.id;
  let url = "https://api.spotify.com/v1/me/albums";
  let qs = {
    ids,
  };

  const options = {
    url,
    method: "put",
    headers: {
      Authorization,
    },
    params: qs,
  };
  console.log("saving");

  let fullResponse = await axios(options);
  res.sendStatus(fullResponse.status);
};

exports.removeAlbum = async (req, res) => {
  let Authorization = req.headers.authorization;
  const ids = req.query.id;
  let url = "https://api.spotify.com/v1/me/albums";
  let qs = {
    ids,
  };

  const options = {
    url,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      Authorization,
    },
    params: qs,
  };
  let fullResponse = await axios(options);
  res.sendStatus(fullResponse.status);
};
