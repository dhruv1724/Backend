import express from 'express'
import cors from 'cors' 
import cookieParser from 'cookie-parser';

const app=express();

app.use(cors({
    origin: process.env.CORS_ORIGIN, //from which frontend url we are allowing the request to come
    credentials: true   //credentials true means we are allowing the cookies to be sent from frontend to backend and vice versa
})) //use method is used for middlewares and configuration of the express app

app.use(express.json({
    limit: '16KB' //this is used to set the maximum size of the json data that can be sent in the request body. If the size of the json data exceeds this limit, then the request will be rejected with a 413 status code (Payload Too Large).
})) //this is used to parse the json data coming from the frontend in the request body

app.use(express.urlencoded({extended: true, limit: '16KB' })) //this is used to parse the urlencoded data coming from the frontend in the request body. It is used when the frontend is sending data in the form of key-value pairs (like form data) instead of json data.
app.use(express.static('public')) //this is used to serve the static files (like images, css files, js files) from the public folder. So if we have any static files that we want to serve to the frontend, we can put them in the public folder and they will be accessible from the frontend.
app.use(cookieParser()) //this is used to parse the cookies coming from the frontend in the request headers. It will make the cookies available in the req.cookies object in the route handlers.
export { app }