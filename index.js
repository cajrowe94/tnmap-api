import express from 'express';
import routes from './routes/index.js';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const port = 8000;

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use('/api', routes);

app.listen(port, function() {
  console.log("Server is running on Port: " + port);
});