import AppController from '../controllers/AppController';
import UserController from '../controllers/UsersController';

const loadRoutes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', UsersController.postNew);
}

export default loadRoutes;

