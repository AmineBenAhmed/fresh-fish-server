import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import "dotenv/config"
//import { initDB } from './config/db';

import authRoutes from './routes/authRouter';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';
import addressRoutes from './routes/addresses.routes';
import deliveryPartnerRoutes from './routes/deliveryPartners.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRouter from './routes/upload.routes';

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

    // Product routes
    app.use('/api/products', productRoutes);

    // Order routes
    app.use('/api/orders', orderRoutes);

    // Address routes
    app.use('/api/addresses', addressRoutes);

    // Delivery Partner routes
    app.use('/api/delivery-partners', deliveryPartnerRoutes);

    // Dashboard routes
    app.use('/api/dashboard', dashboardRoutes);

    // Upload routes
    app.use('/api/upload', uploadRouter);

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
