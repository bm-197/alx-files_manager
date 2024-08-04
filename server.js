import express from 'express';
import loadEnvVariables from './utils/env_loader.js';
import loadRoutes from './routes/index.js';

const app = express();

loadEnvVariables();

const port = process.env.PORT || 5000;
loadRoutes(app);

app.listen(port, () => {
  console.log(`APP has started listening at port: ${port}`);
});

export default app;

