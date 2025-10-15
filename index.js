import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import reelRoute from "./routes/reel.route.js";
import messageRoute from "./routes/message.route.js";
import { app, server } from "./socket/socket.js";
import path from "path";
 dotenv.config({
    path: "./.env"
})
connectDB();


const PORT = process.env.PORT || 3001;

const __dirname = path.resolve();

//middlewares

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
    origin: [`https://youguybackend.vercel.app:8001`, 'https://youguyfrontend.vercel.app'], // autorise seulement ce domaine
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}
// Configuration CORS pour les autres routes
app.use(cors({
  origin: "https://youguyfrontend.vercel.app",
  credentials: true
}));

app.use(cors(corsOptions));

// yha pr apni api ayengi
app.get('/hello', (req, res) => {
  res.send('Hello World from Vercel!');
});
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/reel", reelRoute);
app.use("/api/v1/message", messageRoute);


app.use(express.static(path.join(__dirname, "/frontend/dist")));
app.get("*", (req,res)=>{
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
})


server.listen(PORT, () => {
   
    console.log(`Server listen at port ${PORT}`);
    

});
