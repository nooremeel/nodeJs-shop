require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const adminData = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');

const errorController = require('./controllers/errorController');

const User = require('./models/user');

const mongoose = require('mongoose');
const session = require('express-session');
const mongodbStore = require('connect-mongodb-session')(session);



const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.etoo1jt.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?appName=shop`;

const app = express();

const store = new mongodbStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf();



const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }


};
app.set('view engine', 'ejs');
app.set('views', 'views');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));


app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({ secret: 'this is a secret', resave: false, saveUninitialized: false, store: store }));


app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {

            if (!user) {
                return next();
            }

            req.user = user;
            next();
        })
        .catch(err => {
            next(new Error(err));
        });

});
app.use(csrfProtection);
app.use(flash());
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})

app.use('/admin', adminData.routes);
app.use(shopRoutes);
app.use(authRoutes);


app.use('/500', errorController.get500);
app.use(errorController.get404);
app.use((error, req, res, next) => {
    res.locals.isAuthenticated = req.session?.isLoggedIn;
    res.status(500).render('500', { pageTitle: 'Error', path: '/500' });
})

mongoose.connect(MONGODB_URI)
    .then(result => {


        // https.createServer({key: privateKey, cert: certificate}, app).listen(process.env.PORT || 3000);
        app.listen(process.env.PORT || 3000); 
    }
    )
    .catch(err => console.log(err));