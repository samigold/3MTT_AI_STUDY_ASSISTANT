const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./router/apiRouter.js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Mount API routes at the /api path instead of root path
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});