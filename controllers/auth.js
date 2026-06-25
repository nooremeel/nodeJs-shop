const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator');


const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.SANDGRID_API_KEY
    }
}));

exports.getLogin = (req, res, next) => {

    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: req.flash('error')[0],
        oldInput: { email: '', password: '' },
        validationErrors: []

    });
};


exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: { email: email, password: password },
            validationErrors: errors.array()
        });
    }

    User.findOne({ email: email })
        .then(user => {
            if (!user) {

                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password.',
                    oldInput: { email: email, password: password },
                    validationErrors: []
                });
            }
            bcrypt
                .compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        });
                    }
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        errorMessage: 'Invalid email or password.',
                        oldInput: { email: email, password: password },
                        validationErrors: []
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpsStatusCode = 500;
            return next(error);
        });
};

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: req.flash('error')[0],
        oldInput: { email: '', password: '', confirmPassword: '' },
        validationErrors: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
            validationErrors: errors.array()
        });
    }

    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return user.save()
        })
        .then(result => {
            res.redirect('/login')
                // return transporter.sendMail({
                //     to: email,
                //     from: 'nooremeel1@gmail.com',
                //     subject: 'Welcome to Nodejs Shop',
                //     html: '<h1>Welcome To Nodejs shop</h1> <br> <h1>Your Account was Successfully created<h1>'
                // });

        })
        .catch(err => {
            const error = new Error(err);
            error.httpsStatusCode = 500;
            return next(error);
        });

}


    ;

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    res.render('auth/reset-password', {
        path: '/reset-password',
        pageTitle: 'Reset Password',
        errorMessage: req.flash('error')[0]
    })
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset-password');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account with this email address found');
                    return res.redirect('/reset-password');
                }
                user.resetToken = token;
                user.resetTokenExpire = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                // transporter.sendMail({
                //     to: req.body.email,
                //     from: 'nooremeel1@gmail.com',
                //     subject: 'Password Reset',
                //     html: `
                //     <p>A password reset has been requested</p>
                //     <p>Click the following link to reset the password</p>
                //     </br>
                //     <a href="http://localhost:3000/reset-password/${token}">RESET PASSOWRD</a>
                //     `
                // });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpsStatusCode = 500;
                return next(error);
            })
    })
};

exports.getChangePassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpire: { $gt: Date.now() } })
        .then(user => {
            res.render('auth/change-password', {
                path: '/change-password',
                pageTitle: 'Change Password',
                errorMessage: req.flash('error')[0],
                userId: user._id.toString(),
                passwordToken: token,
                email: user.email
            })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpsStatusCode = 500;
            return next(error);
        });

};


exports.postChangePassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    const email = req.body.email;
    User.findOne({ resetToken: passwordToken, resetTokenExpire: { $gt: Date.now() } })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = null;
            resetUser.resetTokenExpire = undefined;
            return resetUser.save();
        })
        .then(result => {
            res.redirect('/login');
            // transporter.sendMail({
            //     to: req.body.email,
            //     from: 'nooremeel1@gmail.com',
            //     subject: 'Password Change',
            //     html: `
            //         <p>Your Password Has been changed</p>

            //         `
            // });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpsStatusCode = 500;
            return next(error);
        })
};