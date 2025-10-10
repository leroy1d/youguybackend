import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({
    path: "../utils/.env"
})

const connectDB = () => {
    mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 100000, // 100 seconds
    }).then(() => {
        console.log("Connected to MongoDB");
    }).catch(err => {
        console.error('Connection error:', err);
    });
}
export default connectDB;