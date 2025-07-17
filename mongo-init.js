const { MONGO_USER, MONGO_PASS } = process.env;
const MONGO_DB = process.env.MONGO_DB || 'parserDB';

db = db.getSiblingDB(MONGO_DB); // переключаемся на БД parserDB
db.createUser({
  user: MONGO_USER,
  pwd: MONGO_PASS,
  roles: [{ role: 'readWrite', db: MONGO_DB }]
});
