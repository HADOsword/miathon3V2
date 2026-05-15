require("dotenv").config();

const connectDB = require("./db/connect");
const express = require("express");
const cors = require('cors')
const app = express();
const mainRouter = require("./routes/user");

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "10mb" }));

app.use(cors())
app.use("/api/v1", mainRouter);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message =
        statusCode >= 500 && !err.expose
            ? "Something went wrong while processing your request."
            : err.message;

    if (statusCode >= 500) {
        console.error(err);
    }

    return res.status(statusCode).json({ msg: message });
});

const port = process.env.PORT || 3000;

const start = async () => {

    try {        
        await connectDB(process.env.MONGO_URI);
        app.listen(port, () => {
            console.log(`Server is listening on port ${port}`);
        })

    } catch (error) {
       console.log(error); 
    }
}

start();
