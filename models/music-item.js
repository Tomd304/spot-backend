let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let MusicItemSchema = new Schema(
  {
    _id: { type: String, required: true },
    requestType: { type: String, required: true },
    type: { type: String, required: true },
    redditInfo: { type: Object },
    spotInfoFound: { type: Boolean, required: true },
    spotInfo: { type: Object },
  },
  { strict: false }
);
module.exports = mongoose.model("MusicItem", MusicItemSchema);
