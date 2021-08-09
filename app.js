const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();
var session = require('express-session');
const { render } = require('ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie:{
    httpOnly: true,
    secure: false,
    maxage: 1000 * 60 * 30
    }
  }));

app.use((req, res, next) => {
    if (req.session.email === undefined) {
        res.locals.isLoggedIn = false;
    } else {
        res.locals.isLoggedIn = true;
    }
    const url = req.session.url;
    if (url === '/') {
        res.locals.jumpTo = '/';
    } else if (url === '/buy_contents') {
        res.locals.jumpTo = '/buy';
    } else if (url === '/host') {
        res.locals.jumpTo = '/host';
    }
    if (req.session.name !== undefined) {
        res.locals.name = req.session.name;
    }
    next();
});

const connection = mysql.createConnection({ 
    host: 'localhost',
    user: 'root',
    password: '08012783437sS',
    database: 'app'
});

app.get('/host_login', (req, res) => {
    res.render('host_login.ejs');
});

app.post('/host_login', (req, res) => {
    res.redirect('/host');
});

app.get('/host', (req, res) => {
    req.session.url = '/host';
    res.render('host.ejs');
});

app.get('/view_goods', (req, res) => {
    connection.query(
        'select * from goods',
        (error, results) => {
            res.render('view_goods.ejs', {goods: results});
        }
    );
});

app.get('/operationGoodsDetail/:id', (req, res) => {
    connection.query(
        "SELECT * FROM goods WHERE id = ?",
        [req.params.id],
        (error, results) => {
            const r = results;
            connection.query(
                'select * from goodsComent where goods_id = ?',
                [req.params.id],
                (error, results) => {
                    res.render('operationGoodsDetail.ejs', {coment: results, goods: r});
                }
            )
        }
    );
});

app.post('/removeGoods/:id', (req, res) => {
    connection.query(
      'select * from goodsComent where id = ?', 
      [req.params.id],
                (error, results) => {
                    const r = results;
                    connection.query(
                        'delete from goodsComent where id = ?',
                        [req.params.id],
                        (error, results) => {
                            res.redirect('/operationGoodsDetail/' + String(r[0].goods_id));
                        }
                    );
                }
    );
});

app.post('/hostAddComent/:id', (req, res) => {
    connection.query(
        'insert into goodsComent (goods_id, coment) values (?, ?)',
        [req.params.id, req.body.text],
        (error, results) => {
            res.redirect('/operationGoodsDetail/' + String(req.params.id));
        }
    )
});

app.get('/users', (req, res) => {
    connection.query(
        'select * from users',
        (error, results) => {
            res.render('users.ejs', {users: results});
        }
    );
    
});

app.get('/', (req, res) => {
    req.session.url = '/';
    res.render('hello.ejs');
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs', {errors: []});
});

app.post('/signup', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    let errors = []
    if (name === '') {
        errors.push('名前がねぇど');
    }
    if (email === '') {
        errors.push('メールアドレスがねぇど');
    }
    if (password === '') {
        errors.push('パスワードがねぇど');
    }
    if (errors.length === 0) {
        connection.query(
            'select * from users where email = ?',
            [email],
            (error, results) => {
                if (results.length > 0) {
                    res.render('signup.ejs',{errors: ['メールアドレスが既に使われています']});
                } else {
                    connection.query(
                        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                        [name, email, password],
                        (error, results) => {
                            req.session.name = name;
                            req.session.email = email;
                            req.session.password = password;
                            res.redirect('/');
                        }
                    );
                }
            }
        );
    } else {
        res.render('signup.ejs', {errors: errors});
    }
    
});

app.get('/login', (req, res) => {
    if (req.session.goods_info !== undefined) {
        const goods = req.session.goods_info.goods;
        res.render('login.ejs', {contents: goods[0], error: []});
    } else {
        res.render('login.ejs', {error:　[]}); 
    }
    
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const result = req.session.hasOwnProperty("goods_info");
    let errorMessages = [];
    connection.query(
        "select * from users where email = ?",
        [email],
        (error, results) => {
            if ( results.length === 0 ) {
                connection.query(
                    "select * from users WHERE password = ?",
                    [password],
                    (error, results) => {
                        console.log(results);
                        if (results.length === 0) {
                            errorMessages.push('不正');
                            if (result) {
                                res.render('login.ejs',{contents: req.session.goods_info.goods[0], error: errorMessages});
                            } else {
                                res.render('login.ejs', {error: errorMessages});
                            }
                        } else {
                                errorMessages.push('メールアドレスが違います。');
                                if (result) {
                                    res.render('login.ejs',{contents: req.session.goods_info.goods[0], error: errorMessages});
                                } else {
                                    res.render('login.ejs', {error: errorMessages});
                                }
                        }
                    }
                );
            } else {
                const rightEmail = results[0].email === email;
                const rightPassword = results[0].password === password;
            if (rightEmail && rightPassword) {
                    req.session.email = email;
                    req.session.name = results[0].name;
                    req.session.password = password;
                    if (req.session.url === '/') {
                        res.redirect('/');
                    } else {
                        res.redirect('/buy_contents/' + String(req.session.goods_info.goods[0].id)); 
                    }
            } else {
                    errorMessages.push('パスワードが違います');
                    res.locals.isLoggedIn = false;
                    if (result) {
                        res.render('login.ejs',{contents: req.session.goods_info.goods[0], error: errorMessages});
                    } else {
                        res.render('login.ejs', {error: errorMessages});
                    }
            }
        } 
        }
    );
});

app.get('/mypage', (req, res) => {
    connection.query(
        'select * from goods where id in (select goods_name_id from users)',
        (error, results) => {
            console.log(results);
            res.render('mypage.ejs', {goods: results});
        }
    )
    
});

app.get('/logout',(req, res) => {
    req.session.destroy((error) => {
        res.redirect('/');
    });
});

app.use(express.static('public'));

app.get('/top', (req, res) => {
    connection.query(
        "SELECT * FROM goods",
        (error, results) => {
            res.render('top.ejs',{goods: results});
        }
    )
});

connection.connect((error) => {
    if (error) {

    } else {
        console.log('success!');
    }
});

app.get('/detail/:id', (req, res) => {
    connection.query(
        "SELECT * FROM goods WHERE id = ?",
        [req.params.id],
        (error, results) => {
            const r = results;
            connection.query(
                'select * from goodsComent where goods_id = ?',
                [req.params.id],
                (error, results) => {
                    res.render('detail.ejs', {coment: results, goods: r});
                }
            )
        }
    );
});

app.post('/addComent/:id', (req, res) => {
    connection.query(
        'insert into goodsComent (goods_id, coment) values (?, ?)',
        [req.params.id, req.body.text],
        (error, results) => {
            res.redirect('/detail/' + String(req.params.id));
        }
    )
});

app.get('/buy_contents/:id', (req, res) => {
    const id = req.params.id;
    if (res.locals.isLoggedIn) {
        connection.query(
            'update users set goods_name_id = ? where name = ?',
            [id, req.session.name],
            (error, results) => {
                res.render('buy_contents.ejs');
            }
        );
    } else {
        connection.query(
            "SELECT * FROM goods WHERE id = ?",
            [id],
            (error, results) => {
                req.session.url = '/buy_contents';
                req.session.goods_info = {goods: results};
                res.redirect('/login');
            }
        );
    }
});

app.get('/addGoods', (req, res) => {
    res.render('addGoods.ejs', {errors: []});
});

app.post('/insert', (req, res) => {
    const goods_name = req.body.goods_name;
    const price = req.body.price;
    const text = req.body.text;
    const errors = []
    if (goods_name === '') {
        errors.push('商品名を入力してね！');
    }

    if (price === '') {
        errors.push('値段を入力してね！');
    }

    if (text === '') {
        errors.push('特徴を入力してね！');
    }
    if (errors.length === 0) {
        connection.query(
            'INSERT INTO goods (goods_name, price, coment) VALUES (?, ?, ?)',
            [goods_name, price, text],
            (error, results) => {
                console.log(goods_name);
                connection.query(
                    'use app create table ? (id INT AUTO_INCREMENT, coment TEXT, PRIMARY KEY (id))',
                    [goods_name],
                    (error, results) => {
                        res.redirect('/top');
                    }
                )
            }
        );
    } else {
        res.render('addGoods.ejs', {errors: errors})
    }
});

app.get('/insert', (req, res) => {
    res.render('top.ejs');
});

app.get('/remove/:id',(req, res) => {
    connection.query(
        'select * from goods where id = ?',
        [req.params.id],
        (error, results) => {
            console.log(results);
            res.render('removeGoods.ejs', {goods: results});
        }
    )
    
});

app.get('/removeComplete/:id', (req, res) => {
    connection.query(
        'delete from goods where id = ?',
        [req.params.id],
        (error, results) => {
            res.redirect('/view_goods');
        }
    );
});

app.post('/removeUser/:id', (req, res) => {
    connection.query(
        'delete from users where id = ?',
        [req.params.id],
        (error, results) => {
            res.redirect('/users');
        }
    )
});

app.listen(3000); 