# Photo Store - E-commerce with Square Payment Processing

A complete e-commerce example application that sells premium photography prints with integrated Square payment processing.

## Features

- 📸 Photo gallery with 6 premium photography samples
- 🛒 Shopping cart functionality with quantity management
- 💳 Secure payment processing using Square SDK
- 📱 Responsive design for mobile and desktop
- ✨ Modern, clean user interface
- 🔒 PCI-compliant payment handling (card data never touches your server)

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Payment Processing**: Square SDK
- **External APIs**: Square Payments API

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Square Developer Account ([Create one here](https://developer.squareup.com/))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/EcosystemNetwork/BTCAPPSTORE_Payment_Processor.git
cd BTCAPPSTORE_Payment_Processor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Square API Credentials

#### Get Your Square Credentials:

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a new application or select an existing one
3. Navigate to the "Credentials" tab
4. Copy your **Sandbox Access Token** and **Application ID**
5. Copy your **Sandbox Location ID** (found under "Locations")

#### Set Up Environment Variables:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Square credentials:
   ```env
   SQUARE_ACCESS_TOKEN=your_sandbox_access_token
   SQUARE_APPLICATION_ID=your_square_application_id
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_LOCATION_ID=your_location_id
   PORT=3000
   ```

### 4. Run the Application

#### Development Mode (with auto-restart):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The application will start on `http://localhost:3000`

## Testing the Payment Flow

### Using Square Sandbox

Square provides test card numbers for the sandbox environment:

- **Successful Payment**: `4111 1111 1111 1111`
- **CVV**: Any 3 digits (e.g., `111`)
- **Expiration**: Any future date (e.g., `12/25`)
- **Postal Code**: Any 5 digits (e.g., `12345`)

### Test Flow:

1. Browse the photo gallery on the homepage
2. Add photos to your cart
3. Click the cart icon to review your items
4. Proceed to checkout
5. Enter your email and payment details
6. Complete the payment
7. View the success confirmation with order ID

## Project Structure

```
.
├── server.js              # Express server with Square integration
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── public/               # Frontend files
│   ├── index.html        # Main HTML page
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       └── app.js        # Frontend JavaScript
└── README.md             # This file
```

## API Endpoints

### GET `/api/config`
Returns configuration needed by the frontend.
- **Returns**: Square Application ID, Location ID, and configuration status

### GET `/api/products`
Returns the list of available photo products.

### GET `/api/products/:id`
Returns details of a specific product.

### POST `/api/orders`
Creates a new order.
- **Body**: `{ items: [...], customerEmail: "..." }`
- **Returns**: Order details with total

### POST `/api/payment`
Processes a payment through Square.
- **Body**: `{ sourceId: "...", amount: ..., orderId: "..." }`
- **Returns**: Payment result with receipt URL

### GET `/api/health`
Health check endpoint to verify server and Square configuration status.

## Deploying to Vercel

This application is configured for easy deployment on Vercel:

### Quick Deploy

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy from GitHub**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Click "Deploy"

3. **Deploy from CLI**:
   ```bash
   vercel
   ```

### Environment Variables on Vercel

Add these environment variables in your Vercel project settings:

```
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=your_square_location_id
```

**Important Notes:**
- Use **sandbox** credentials for testing
- Use **production** credentials for live deployment
- Environment variables are set in: Project Settings → Environment Variables
- Redeploy after adding/changing environment variables

### Vercel Configuration

The application includes a `vercel.json` file that:
- Routes `/api/*` requests to the Express server
- Serves static files from the `/public` directory
- Configures the Node.js runtime for serverless deployment

## Going to Production

To use this in production:

1. Update environment variables to use production credentials:
   ```env
   SQUARE_ENVIRONMENT=production
   SQUARE_ACCESS_TOKEN=your_production_access_token
   SQUARE_APPLICATION_ID=your_production_application_id
   SQUARE_LOCATION_ID=your_production_location_id
   ```

2. Use real product images and update the product catalog in `server.js`

3. Add proper error logging and monitoring

4. Implement order storage (database)

5. Add email confirmations for orders

6. Implement proper authentication if needed

## Security Considerations

- ✅ Card data is handled client-side by Square and never touches your server
- ✅ Access tokens are stored in environment variables
- ✅ Payment tokenization happens on the frontend
- ✅ Uses HTTPS in production (required by Square)
- ⚠️ Add rate limiting for production
- ⚠️ Implement proper session management
- ⚠️ Add CSRF protection for production

## Customization

### Adding Products

Edit the `products` array in `server.js`:

```javascript
const products = [
  {
    id: 'photo-1',
    name: 'Your Photo Name',
    description: 'Description here',
    price: 2999, // Price in cents ($29.99)
    image: 'https://your-image-url.com/photo.jpg',
  },
  // ... more products
];
```

### Styling

Modify `public/css/style.css` to customize colors, fonts, and layout.

### Payment Options

The Square SDK supports multiple payment methods. To add more:
- Apple Pay
- Google Pay
- Gift Cards
- Cash App Pay

See [Square Payment Form documentation](https://developer.squareup.com/docs/web-payments/overview) for details.

## Troubleshooting

### "Square credentials not configured" warning
- Make sure your `.env` file exists and contains valid credentials (local development)
- For Vercel: Check environment variables in Project Settings → Environment Variables
- Restart the server after updating `.env` (local) or redeploy (Vercel)

### Payment form doesn't load
- Check that you've configured `SQUARE_APPLICATION_ID` environment variable
- Verify your application ID matches your environment (sandbox/production)
- Check browser console for errors
- Ensure Square SDK script is loading (check Network tab in browser DevTools)

### Payment fails
- Verify you're using valid test card numbers in sandbox
- Check that your location ID matches your access token
- Review server logs for detailed error messages
- For Vercel: Check Function Logs in the Vercel dashboard

### Vercel deployment issues
- **Build fails**: Check that all dependencies are in `package.json`
- **API routes return 404**: Verify `vercel.json` is present and properly configured
- **Environment variables not working**: Ensure variables are set in Vercel dashboard and you've redeployed
- **Function timeout**: Check Vercel Function Logs for errors; consider optimizing slow operations

### 500 Internal Server Error on Vercel
- Check Vercel Function Logs for detailed error messages
- Verify all environment variables are correctly set
- Ensure Square credentials match the environment (sandbox vs production)

## License

MIT

## Support

For Square API support, visit [Square Developer Documentation](https://developer.squareup.com/docs).

For issues with this example application, please open an issue on GitHub.