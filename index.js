const express = require("express");
const port = 5000;
const cors = require("cors");
require("dotenv").config();

const searchRouter = require("./routes/search");

let mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
var app = express();

app.use(cors());
app.use("/search", searchRouter);

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

module.exports = app;
