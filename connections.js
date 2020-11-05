const MongoClient = require('mongodb').MongoClient


class Connection {
  static async connectToMongo(url) {
    if (this.client) return this.client
    this.client = await MongoClient.connect(url, this.options)
    return this.client
  }
}

Connection.client = null;
Connection.options = {
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

module.exports = { Connection }