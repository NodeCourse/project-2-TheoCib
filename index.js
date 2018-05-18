const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//configuarations----------------------
const COOKIE_SECRET = 'cookie secret';
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'pug');
app.use(express.static("public"));
app.use(cookieParser(COOKIE_SECRET));
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//Strategie d'authentification via email + password---------------------
passport.use(new LocalStrategy((email, password, done) => {
    User
        .findOne({
            where: {
                email
            }
        })
        .then(function (user) {
            if (!user || user.password !== password) {
                return done(null, false, {
                    message: 'Email inconnue ou mdp invalide'
                });
            }
            return done(null, user)
        })
        .catch(done);
}));

passport.serializeUser((user, cb) => {
    cb(null, user.email);
});
passport.deserializeUser((email, cb) => {
    User.findOne({where: {email}})
        .then((user) => {
            cb(null, user)
        })
});

//Que faire si les données sont justes/fausses----------------------
//Sur la page login
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

//Se deconnecter
app.get('/api/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

//Initialisation des BDD-------------------
const db = new Sequelize('questionnaire', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = db.define('user', {
    firstname: {type: Sequelize.STRING},
    lastname: {type: Sequelize.STRING},
    email: {type: Sequelize.STRING},
    password: {type: Sequelize.STRING}
});

const Survey = db.define('survey', {
    title: {type: Sequelize.STRING},
    topic: {type: Sequelize.STRING}
});

const Question = db.define('question', {
    content: {type: Sequelize.STRING}
});

const Answer = db.define('answer', {
    answerContent: {type: Sequelize.STRING}
});

function sync() {
    User.sync();
    Survey.sync();
    Question.sync();
    Answer.sync();
}

Survey.hasMany(Question);
Question.belongsTo(Survey);
Question.hasMany(Answer);
Answer.belongsTo(Question);
sync();


//Routes------------------------------
//Page principale
app.get('/', (req, res) => {
    Survey
        .findAll()
        .then(surveys => res.render("home", {surveys, user: req.user}));
});

//Page inscription
app.get('/signup', (req, res) => {
    res.render("signup");
});

//page connexion
app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/surveyadd', (req, res) => {
    res.render("surveyadd", { user: req.user});
});

app.get('/confirme', (req, res) => {
    res.render("confirme", { user: req.user});
});

app.get('/answersurvey/:surveyId', (req, res) => {
    surveyId = req.params.surveyId
    Survey
        .findOne({include: [Question], where: {id: surveyId}})
        .then((survey) => {
            res.render("answersurvey", {survey, user: req.user})
        })
});

//posts----------------------
app.post('/signup', (req, res) => {
    User
        .sync()
        .then(() => {
            User.create({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    password: req.body.password
                }
            )
        })
        .then(() => {
            res.redirect('/')
        })
});

app.post('/surveyadd', (req, res) => {
    Survey.create({
        title: req.body.title,
        topic: req.body.topic
    })

        .then((survey) => {
            Question.create({
                content: req.body.question1,
                surveyId: survey.id,
            })
            Question.create({
                content: req.body.question2,
                surveyId: survey.id,
            })
            Question.create({
                content: req.body.question3,
                surveyId: survey.id,
            })
            Question.create({
                content: req.body.question4,
                surveyId: survey.id,
            })
        })
        .then(() => {
            res.redirect("/")
        })
});

app.post('/answersurvey/:surveyId', (req, res) => {
    let surveyId = req.params.surveyId;

    Answer
        .sync()
        .then(function () {
            return Question.findAll({where: {surveyId: surveyId}})
        })
        .then((question) => {
            for (let i=0 ; i < question.length; i++) {
                Answer.create({
                    answerContent: req.body["answer" + question[i].id],
                    questionId: question[i].id
                })
            }
        })
        .then(() => {
            res.redirect('/confirme')
        })
});

app.listen(3000);
