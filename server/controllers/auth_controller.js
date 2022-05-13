const axios = require("axios");
require("dotenv").config();

//generate random string to use as state parameter in spotify api request
const generateRandomString = (length) => {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

exports.login = (req, res) => {
  var scope =
    "user-library-read user-library-modify user-read-email user-read-private playlist-modify-public";

  var state = generateRandomString(16);
  console.log(process.env.REDIRECT_URI);
  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.REDIRECT_URI,
    state: state,
  });
  console.log("Login redirecting");
  res.redirect(
    "https://accounts.spotify.com/authorize/?" +
      auth_query_parameters.toString()
  );
};

exports.callback = async (req, res) => {
  var code = req.query.code;
  console.log("Callback Started");
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    method: "post",
    params: {
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    json: true,
  };
  let fullResponse;
  try {
    fullResponse = await axios(authOptions);
  } catch (err) {
    console.log(err);
  }
  if (fullResponse.status === 200) {
    res.redirect(
      process.env.FRONTEND_URL + "?code=" + fullResponse.data.access_token
    );
  }
};
