require("dotenv").config();

const app = require("./src/app");
const connectToDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;

connectToDB()
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message || err);
    console.error("Verify MONGO_URI and network/DNS access for MongoDB Atlas.");
    process.exit(1);
  });
