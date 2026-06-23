import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import "dotenv/config"
//import { initDB } from './config/db';

import authRoutes from './routes/authRouter';

// Create an Express application
const app = express();

async function startServer() {
  try {
    //connect to the DB
    //await initDB()

    // Middleware to parse JSON bodies
    app.use(express.json());

    // Enable CORS for all routes
    app.use(cors());

    // Auth routes
    app.use('/api/auth', authRoutes);

    // Define a route to test the server
    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);
      const status = err.status || 500;
      const message = err.message || 'Internal server error';
      res.status(status).json({ error: message });
    });

    // Get port number from environment variables or default to 3000
    const PORT = process.env.PORT || 3000;

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

startServer()
