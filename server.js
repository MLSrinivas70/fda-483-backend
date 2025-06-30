import 'dotenv/config' ;
import express from 'express';
import cors from 'cors';
import routes from './src/routes/index.js';

// Load environment variables

const app = express();

const PORT = process.env.PORT || 3000;

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});