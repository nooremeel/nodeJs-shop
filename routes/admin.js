const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAuth = require('../middleware/is-auth');
const { check, body } = require('express-validator');

router.get('/add-product', isAuth, adminController.getAddProduct);
router.post('/add-product' ,isAuth,
    [
        body('title').trim().notEmpty().withMessage('Please enter a valid title'),
        // body('imageUrl').isURL().withMessage('Please enter a valid image URL'),
        body('price').isFloat().withMessage('Please enter a valid price'),
        body('description').trim()
            .isLength({ min: 5 }).withMessage('Description must be at least 5 characters')
            .isLength({ max: 400 }).withMessage('Description must be at most 400 characters')
    ],
    adminController.postAddProduct);

router.get('/product-list', isAuth, adminController.getProducts);
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct)
router.post('/edit-product', isAuth,
    [
        body('title').trim().notEmpty().withMessage('Please enter a valid title'),
        // body('imageUrl').isURL().withMessage('Please enter a valid image URL'),
        body('price').isFloat().withMessage('Please enter a valid price'),
        body('description').trim()
            .isLength({ min: 5 }).withMessage('Description must be at least 5 characters')
            .isLength({ max: 400 }).withMessage('Description must be at most 400 characters')
    ],
    adminController.postEditProduct);
router.delete('/product/:productId', isAuth, adminController.deleteProduct);
exports.routes = router;