const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile 
} = require('../controllers/authController');
const { 
  validateRegistration, 
  validateLogin 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');


router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);


router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;