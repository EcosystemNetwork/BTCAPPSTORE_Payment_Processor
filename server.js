require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { SquareClient, SquareEnvironment } = require('square');
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
const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || 'PLACEHOLDER_TOKEN',
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// Photo products catalog
const products = [
  {
    id: 'photo-1',
    name: 'Mountain Sunset',
    description: 'Beautiful sunset over mountain peaks',
    price: 2999, // Price in cents
    image: '/tiny/tiny1.webp',
  },
  {
    id: 'photo-2',
    name: 'Ocean Waves',
    description: 'Serene ocean waves at dawn',
    price: 3499,
    image: '/tiny/tiny2.webp',
  },
  {
    id: 'photo-3',
    name: 'Forest Path',
    description: 'Mystical forest path in autumn',
    price: 2499,
    image: '/tiny/tiny3.webp',
  },
  {
    id: 'photo-4',
    name: 'City Lights',
    description: 'Urban cityscape at night',
    price: 3999,
    image: '/tiny/tiny4.webp',
  },
  {
    id: 'photo-5',
    name: 'Desert Dunes',
    description: 'Golden sand dunes at sunset',
    price: 2799,
    image: '/tiny/tiny5.webp',
  },
  {
    id: 'photo-6',
    name: 'Northern Lights',
    description: 'Aurora borealis over snowy landscape',
    price: 4999,
    image: '/tiny/tiny6.webp',
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

  // Validate currency is a valid 3-letter code
  if (!/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({ error: 'Invalid currency: must be a 3-letter code (e.g., USD)' });
  }

  // Validate Square credentials are configured
  if (!process.env.SQUARE_LOCATION_ID) {
    return res.status(500).json({ error: 'Square payment system is not configured' });
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

    // Validate response structure
    if (!result || !result.payment) {
      throw new Error('Invalid payment response from Square');
    }

    // Log warning if payment response is missing expected fields
    if (!result.payment.amountMoney) {
      console.warn('Payment response missing amountMoney field, using request values');
    }

    res.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney?.amount?.toString() || amount.toString(),
        currency: result.payment.amountMoney?.currency || currency,
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

  // Validate items structure
  for (const item of items) {
    if (!item.id || !item.quantity) {
      return res.status(400).json({ error: 'Invalid item structure: id and quantity required' });
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity: must be a positive integer' });
    }
    const product = products.find(p => p.id === item.id);
    if (!product) {
      return res.status(400).json({ error: `Product not found: ${item.id}` });
    }
  }

  // Validate email if provided
  // Using a reasonable email validation regex that handles most common cases
  // For production, consider using a dedicated email validation library
  if (customerEmail) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(customerEmail) || customerEmail.length > 254) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }
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

// Start server (for local development)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Square environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
    
    if (missingConfig.length > 0) {
      console.warn('⚠️  Warning: Missing Square credentials:', missingConfig.join(', '));
    } else {
      console.log('✓ Square credentials configured');
    }
  });
}

// Export the Express app for Vercel serverless deployment
module.exports = app;
