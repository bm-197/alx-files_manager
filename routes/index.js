import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';

const loadRoutes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', UsersController.postNew);
}

export default loadRoutes;

