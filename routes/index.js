import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';
import AuthController from '../controllers/AuthController.js';
import { tokenMiddleware, authMiddleware } from '../middlewares/auth.js';
import FileController from '../controllers/FilesController.js';

const loadRoutes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', UsersController.postNew);
  app.get('/connect', authMiddleware, AuthController.getConnect);
  app.get('/disconnect', tokenMiddleware, AuthController.getDisconnect);
  app.get('/users/me', tokenMiddleware, UsersController.getMe);
  app.post('/files', tokenMiddleware, FileController.postUpload);
}

export default loadRoutes;
