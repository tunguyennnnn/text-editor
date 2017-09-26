const dotenv = require('dotenv')
dotenv.config()

const devConfig = {
  env: 'development',
  MONGOOSE_DEBUG: true,
  db: 'mongodb://tunguyenuni:tunguyen1989@cluster0-shard-00-00-s7m4n.mongodb.net:27017,cluster0-shard-00-01-s7m4n.mongodb.net:27017,cluster0-shard-00-02-s7m4n.mongodb.net:27017/tuapp?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
  port: process.env.PORT || 4000
}
module.exports = devConfig
