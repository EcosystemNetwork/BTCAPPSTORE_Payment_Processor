require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Validate Square configuration
const requiredSquareConfig = ['SQUARE_ACCESS_TOKEN', 'SQUARE_APPLICATION_ID', 'SQUARE_LOCATION_ID'];
const missingConfig = requiredSquareConfig.filter(key => !process.env[key]);

if (missingConfig.length > 0) {
  console.warn('⚠️  Warning: Missing Square credentials:', missingConfig.join(', '));
  console.warn('   Payment processing will not work without valid credentials.');
  console.warn('   Please configure all required values in your .env file.');
}

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || 'PLACEHOLDER_TOKEN',
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
});

// Photo products catalog
const products = [
  {
    id: 'photo-1',
    name: 'Mountain Sunset',
    description: 'Beautiful sunset over mountain peaks',
    price: 2999, // Price in cents
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  },
  {
    id: 'photo-2',
    name: 'Ocean Waves',
    description: 'Serene ocean waves at dawn',
    price: 3499,
    image: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400',
  },
  {
    id: 'photo-3',
    name: 'Forest Path',
    description: 'Mystical forest path in autumn',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
  },
  {
    id: 'photo-4',
    name: 'City Lights',
    description: 'Urban cityscape at night',
    price: 3999,
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400',
  },
  {
    id: 'photo-5',
    name: 'Desert Dunes',
    description: 'Golden sand dunes at sunset',
    price: 2799,
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400',
  },
  {
    id: 'photo-6',
    name: 'Northern Lights',
    description: 'Aurora borealis over snowy landscape',
    price: 4999,
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400',
  },
];

// API Routes

// Get configuration for frontend
app.get('/api/config', (req, res) => {
  const isConfigured = !!(process.env.SQUARE_ACCESS_TOKEN && 
                          process.env.SQUARE_APPLICATION_ID && 
                          process.env.SQUARE_LOCATION_ID);
  
  res.json({
    squareApplicationId: process.env.SQUARE_APPLICATION_ID || '',
    squareLocationId: process.env.SQUARE_LOCATION_ID || '',
    squareConfigured: isConfigured,
  });
});

// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Process payment
app.post('/api/payment', async (req, res) => {
  const { sourceId, amount, currency = 'USD', orderId } = req.body;

  if (!sourceId || !amount) {
    return res.status(400).json({ error: 'Missing required payment information' });
  }

  // Validate amount is a positive integer
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount: must be a positive integer in cents' });
  }

  try {
    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amount),
        currency,
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Photo Store Order: ${orderId || 'N/A'}`,
    });

    res.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney.amount.toString(),
        currency: result.payment.amountMoney.currency,
        receiptUrl: result.payment.receiptUrl,
      },
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed',
    });
  }
});

// Create order endpoint
app.post('/api/orders', async (req, res) => {
  const { items, customerEmail } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }

  // Calculate total
  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const orderId = randomUUID();

  res.json({
    orderId,
    items,
    total,
    customerEmail,
    createdAt: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    squareConfigured: !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Square environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
  
  const requiredSquareConfig = ['SQUARE_ACCESS_TOKEN', 'SQUARE_APPLICATION_ID', 'SQUARE_LOCATION_ID'];
  const missingConfig = requiredSquareConfig.filter(key => !process.env[key]);
  
  if (missingConfig.length > 0) {
    console.warn('⚠️  Warning: Missing Square credentials:', missingConfig.join(', '));
  } else {
    console.log('✓ Square credentials configured');
  }
});
