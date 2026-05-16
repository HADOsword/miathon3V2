const mongoose = require("mongoose");
const JobMatch = require("../models/JobMatch");

const dropLegacyIndexes = async () => {
  const legacyJobMatchIndex = "userId_1_resumeId_1_jobId_1";

  try {
    await JobMatch.collection.dropIndex(legacyJobMatchIndex);
    console.log(`Dropped legacy JobMatch index: ${legacyJobMatchIndex}`);
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      throw error;
    }
  }
};

const connectDB = async (url) => {
  const connection = await mongoose.connect(url, {});

  await dropLegacyIndexes();

  return connection;
};

module.exports = connectDB;
