const app = require('../server');

// Export a handler compatible with Vercel serverless functions
module.exports = (req, res) => app(req, res);
