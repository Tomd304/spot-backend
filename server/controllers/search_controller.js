const requestPromise = require("request-promise");
const he = require("he");
const { format: prettyFormat } = require("pretty-format");
let MusicItem = require("../models/music-item");

exports.getItems = async (req, res) => {
  console.time("dbsave");
  const access_token = req.headers["authorization"];
  const params = req.query;

  //Gets reddit API call results
  const redditData = await searchReddit(params.q, params.t, params.sort);

  //Parses reddit results into useable data (array of objects)
  const parsedRedditData = parseRedditData(redditData, params.q);
  let redditIDs = parsedRedditData.map((i) => i._id);
  const dbData = await MusicItem.find({
    _id: {
      $in: redditIDs,
    },
  });
  let dbDetails = [];
  let dbIDs = [];
  if (dbData.length > 0) {
    dbDetails = dbData.map((i) => {
      return {
        ...i._doc,
        redditInfo: parsedRedditData.find((j) => j._id == i._doc._id)
          .redditInfo,
      };
    });
    dbIDs = dbDetails.map((i) => i._id);
    let noResults = dbDetails
      .filter((i) => i.spotInfoFound == false)
      .map((i) => i._id);
    redditIDs = redditIDs.filter((i) => !noResults.includes(i));
  }
  const apiItems = parsedRedditData.filter((i) => !dbIDs.includes(i._id));
  let apiDetails = [];
  if (apiItems.length > 0) {
    apiDetails = await getSpotDetails(apiItems, params.q, access_token);
    await MusicItem.insertMany(apiDetails);
  }
  let allItems = [...dbDetails, ...apiDetails];
  //sorts back to original order
  allItems = redditIDs
    .map((id) => allItems.find((item) => item._id == id))
    .filter((i) => typeof i !== "undefined");

  //Removes duplicates from array
  allItems = Array.from(new Set(allItems.map((item) => item.spotInfo.url))).map(
    (url) => {
      return allItems.find((item) => item.spotInfo.url === url);
    }
  );

  console.timeEnd("dbsave");
  console.log("RETURNING: " + allItems.length + " items");
  res.json({
    results: allItems,
  });
};

const searchReddit = async (q, t, sort) => {
  // Sets manual search string for Reddit API based on request
  q =
    q == "album"
      ? '?q=flair_name:"FRESH ALBUM" OR "FRESH ALBUM" OR "FRESH EP" OR "FRESH MIXTAPE"&'
      : '?q=flair_name:"FRESH" OR "FRESH" -flair_name:"FRESH ALBUM" -"FRESH ALBUM" -"FRESH EP" -"FRESH MIXTAPE" -"VIDEO"&';

  let url = "https://www.reddit.com/r/hiphopheads/search.json";
  url += q;
  url += "sort=" + sort + "&";
  url += "t=" + t + "&";
  url += "restrict_sr=" + "1" + "&";
  url += "limit=" + "50" + "&";
  url += "after=" + "after";

  const options = {
    url,
    method: "get",
    mode: "cors",
  };

  //Makes call to reddit API
  const res = JSON.parse(await requestPromise(options));

  //Stores array of results
  const data = res.data.children;

  //Stores after key to be used in next call
  const after = res.data.after;

  //Filters out results with low score / upvotes
  const filteredData = data.filter((child) => child.data.score > 5);
  return filteredData;
};

const parseRedditData = (list, requestType) => {
  //Creates array of two types of object eith useable data from reddit api results.
  //Filtered by reddit results that include a spotify link in title or description, and those that do not.
  const results = list.map((child) => {
    let tempObj = {};
    if (child.data.url.includes("open.spotify.com")) {
      tempObj = {
        type: "spotify",
        spotInfo: {
          id: extractID(child.data.url),
          type: extractSpotType(child.data.url),
        },
      };
    } else if (child.data.selftext.includes("open.spotify.com")) {
      tempObj = {
        type: "spotify",
        spotInfo: {
          id: extractID(child.data.selftext),
          type: extractSpotType(child.data.selftext),
        },
      };
    } else {
      tempObj = {
        type: "text",
        spotInfo: null,
      };
    }
    return {
      _id: child.data.id,
      requestType,
      redditInfo: {
        artist: extractArtist(he.decode(child.data.title)),
        album: extractAlbum(he.decode(child.data.title)),
        score: child.data.score,
        url: "https://www.reddit.com" + child.data.permalink,
      },
      ...tempObj,
    };
  });
  return results;
};

const extractID = (str) => {
  let splitStr = str.split(".spotify.com/")[1];

  let startIndex;
  try {
    startIndex = splitStr.indexOf("/") + 1;
  } catch (err) {
    console.log(err);
    console.log(str);
  }

  return splitStr.substring(startIndex, startIndex + 22);
};

const extractSpotType = (str) => {
  return str.split(".spotify.com/")[1].split("/")[0];
};

const extractArtist = (str) => {
  let reducedStr = str
    .replace(/\[[^()]*\]/g, "")
    .replace(/\([^()]*\)/g, "")
    .replace("and", " ")
    .replace("/", " ")
    .replace("\\", " ")
    .replace("#", " ")
    .replace("&", " ")
    .replace('"', " ")
    .replace(":", " ");
  reducedStr = reducedStr.split(" - ")[0];
  reducedStr = reducedStr.includes("ft.")
    ? reducedStr.split("ft.")[0]
    : reducedStr;
  reducedStr = reducedStr.trim();
  return reducedStr;
};

const extractAlbum = (str) => {
  let reducedStr = str
    .replace(/\[[^()]*\]/g, "")
    .replace(/\([^()]*\)/g, "")
    .replace("and", " ")
    .replace("ft.", " ")
    .replace("/", " ")
    .replace("\\", " ")
    .replace("#", " ")
    .replace("&", " ");

  return reducedStr.split(" - ")[1];
};

const getSpotDetails = async (redditData, requestType, access_token) => {
  //Splits reddit results objects into 3 arrays. Spotify album urls, spotify track urls and Text for manual search
  const [albumData, trackData, strSearchData] = [
    redditData.filter(
      (item) => item.type == "spotify" && item.spotInfo.type == "album"
    ),
    redditData.filter(
      (item) => item.type == "spotify" && item.spotInfo.type == "track"
    ),
    redditData.filter((item) => item.type == "text"),
  ];

  //Makes different Spotify API calls depending on data supplied
  //Then combines results back into single array
  let spotifyResults = [];
  spotifyResults =
    albumData.length > 0
      ? [
          ...spotifyResults,
          ...(await getSpotItems(
            albumData,
            "album",
            requestType,
            access_token
          )),
        ]
      : [...spotifyResults];
  spotifyResults =
    trackData.length > 0
      ? [
          ...spotifyResults,
          ...(await getSpotItems(
            trackData,
            "track",
            requestType,
            access_token
          )),
        ]
      : [...spotifyResults];
  spotifyResults =
    strSearchData.length > 0
      ? [
          ...spotifyResults,
          ...(await getSpotSearches(strSearchData, access_token)),
        ]
      : [...spotifyResults];

  await MusicItem.insertMany(
    spotifyResults.filter((item) => !item.spotInfoFound)
  );

  spotifyResults = spotifyResults.filter(
    (item) => item.spotInfoFound && !isIllegalTerm(item)
  );

  return spotifyResults;
};

const getSpotItems = async (itemList, spotType, requestType, access_token) => {
  let results = [];

  //API allows reqeuests of 20 albums at once, and 50 tracks at once
  const chunkSize = requestType == "album" ? 20 : 50;

  for (let i = 0; i < itemList.length; i += chunkSize) {
    //splits itemList into smaller array to not exceed API rate limit
    const chunk = itemList.slice(i, i + chunkSize);

    //Constructs url with multiple id's
    let url = `https://api.spotify.com/v1/${spotType}s/?ids=`;
    chunk.forEach((item) => {
      url += item.spotInfo.id + ",";
    });
    url = url.slice(0, -1);

    const options = {
      url,
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: access_token,
      },
    };
    const res = JSON.parse(await requestPromise(options));

    //Loops through spotify API res and creates useable object depending on album or track.
    if (spotType == "album") {
      chunk.forEach(function (item, i) {
        //if searching for track, filters out full albums accidentally picked up
        if (requestType == "track" && res.albums[i].total_tracks > 2) {
          return undefined;
        }
        try {
          results.push({
            ...item,
            spotInfoFound: true,
            spotInfo: {
              name: res.albums[i].name,
              image: res.albums[i].images[0].url,
              released: res.albums[i].release_date,
              url: res.albums[i].external_urls.spotify,
              artist: {
                name: res.albums[i].artists[0].name,
                url: res.albums[i].artists[0].external_urls.spotify,
              },
              album: {
                name: res.albums[i].name,
                url: res.albums[i].external_urls.spotify,
              },
            },
          });
        } catch (err) {
          console.log("missing details for:");
          console.table(item);
        }
      });
    } else if (spotType == "track") {
      chunk.forEach(function (item, i) {
        if (res.tracks[i].type !== "album") {
          try {
            results.push({
              ...item,
              spotInfoFound: true,
              spotInfo: {
                name: res.tracks[i].name,
                image: res.tracks[i].album.images[0].url,
                url: res.tracks[i].external_urls.spotify,
                released: res.tracks[i].release_date,
                artist: {
                  name: res.tracks[i].artists[0].name,
                  url: res.tracks[i].artists[0].external_urls.spotify,
                },
                album: {
                  name: res.tracks[i].album.name,
                  url: res.tracks[i].album.external_urls.spotify,
                },
              },
            });
          } catch (err) {
            console.log("missing details for:");
            console.table(item);
          }
        }
      });
    }
  }
  return results;
};

const getSpotSearches = async (searchList, access_token) => {
  let spotResults = await Promise.all(
    searchList.map(async (item) => {
      //Searches spotify API using manually parsed artist & item terms extracted from reddit title for each item
      let url = `https://api.spotify.com/v1/search?q=${encodeURI(
        item.redditInfo.artist + " " + item.redditInfo.album
      )}&type=${item.requestType}`;

      let options = {
        url,
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: access_token,
        },
      };
      const res = JSON.parse(await requestPromise(options));

      //Spotify API may return multiple results per search. Basic match on reddit title terms to try and specify correct item from list.
      const selectedItem =
        item.requestType == "album"
          ? validateAlbum(
              res.albums.items,
              item.redditInfo.album,
              item.redditInfo.artist
            )
          : validateTrack(
              res.tracks.items,
              item.redditInfo.album,
              item.redditInfo.artist
            );
      if (selectedItem) {
        if (selectedItem.type == "album") {
          return {
            ...item,
            spotInfo: {
              name: selectedItem.name,
              image: selectedItem.images[0].url,
              url: selectedItem.external_urls.spotify,
              released: selectedItem.release_date,
              artist: {
                name: selectedItem.artists[0].name,
                url: selectedItem.artists[0].external_urls.spotify,
              },
              album: {
                name: selectedItem.name,
                url: selectedItem.external_urls.spotify,
              },
              id: selectedItem.id,
              type: extractSpotType(selectedItem.external_urls.spotify),
            },
            spotInfoFound: true,
          };
        } else if (selectedItem.type == "track") {
          return {
            ...item,
            spotInfo: {
              name: selectedItem.name,
              image: selectedItem.album.images[0].url,
              url: selectedItem.external_urls.spotify,
              released: selectedItem.release_date,
              artist: {
                name: selectedItem.album.artists[0].name,
                url: selectedItem.album.artists[0].external_urls.spotify,
              },
              album: {
                name: selectedItem.album.name,
                url: selectedItem.album.external_urls.spotify,
              },
              id: selectedItem.id,
              type: extractSpotType(selectedItem.album.external_urls.spotify),
            },
            spotInfoFound: true,
          };
        }
      } else {
        return {
          ...item,
          spotInfo: {},
          spotInfoFound: false,
        };
      }
    })
  );
  return spotResults;
};

const validateAlbum = (albums, confirmation1, confirmation2) => {
  if (albums.length == 0) {
    return false;
  } else if (albums.length == 1) {
    return albums[0];
  } else {
    //loop through search results and see if any terms match to reddit title terms
    let found = false;
    let correctAlbum = {};
    albums.some((album) => {
      if (
        typeof confirmation1 !== "undefined" &&
        typeof confirmation2 !== "undefined" &&
        (album.name.toUpperCase() == confirmation1.trim().toUpperCase() ||
          album.name.toUpperCase() == confirmation2.trim().toUpperCase())
      ) {
        correctAlbum = album;
        found = true;
        return "exit loop";
      }
    });
    return found ? correctAlbum : albums[0];
  }
};

const validateTrack = (tracks) => {
  if (tracks.length == 0) {
    return false;
  }
  //ensures that a full album is not selected from spotify api results
  else if (tracks.length == 1 && tracks[0].album.album_type == "single") {
    return tracks[0].album;
  } else if (tracks[0].type == "track") {
    return tracks[0];
  } else {
    let found = false;
    let correctTrack = {};
    let counter = 0;
    tracks.some((track) => {
      if (track.album.album_type == "single" || track.type == "track") {
        correctTrack = track;
        found = true;
        return "exit loop";
      }
      //only checks first two results as further results are usually not relevant
      if (counter > 1) {
        found = false;
        return "exit loop";
      }
      counter += 1;
    });
    return found
      ? correctTrack
      : tracks[0].album.album_type == "single"
      ? tracks[0]
      : false;
  }
};

const isSavedToSpotify = (id) => {};

//filtering out manually identified issues with data parsing
const isIllegalTerm = (item) => {
  let name = item.spotInfo.name.toLowerCase();
  let type = item.requestType;
  if (
    name.includes("karaoke") ||
    name.includes("meditation") ||
    (name.includes("donda") && type == "track")
  ) {
    return true;
  }
  return false;
};
