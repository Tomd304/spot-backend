const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT;
const compression = require("compression");
const helmet = require("helmet");

const searchRouter = require("./routes/search");

let mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
var app = express();

app.use(compression()); //Compress all routes
app.use(helmet());
app.use(cors());
app.use("/search", searchRouter);

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

module.exports = app;
