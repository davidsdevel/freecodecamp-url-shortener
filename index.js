require('dotenv').config();

const express = require('express');
const cors = require('cors');
const dns = require('dns');
const {parse: parseUrl} = require('url');
const app = express();

const port = process.env.PORT || 3000;

// init sqlite db
const sqlite3 = require('sqlite3').verbose();

//Change DB on production
const db = new sqlite3.Database(':memory:');

db.run('CREATE TABLE shorts (id INTEGER PRIMARY KEY, url TEXT)', err => {
  if (err)
    throw err;
});

app
  .use(cors())
  .use(express.json())
  .use(express.urlencoded({extended: true}))
  .use('/public', express.static(`${process.cwd()}/public`));

app
  .get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'))
  .post('/api/shorturl', (req, res) => {
    const {url} = req.body;

    const {hostname, protocol} = parseUrl(url);

    if (!/https?:/.test(hostname))
      return res.json({
        error: 'invalid url'
      });

    dns.lookup(hostname, err => {
      if (err)
        return res.json({
          error: 'invalid url'
        });

      db.run('INSERT INTO shorts(url) VALUES (?)', [url], function(err) {
        //TODO: Handle error
        if (err)
          throw err;

        res.json({original_url: url, short_url : this.lastID});
      });
    });
  })
  .get('/api/shorturl/:short_url', (req, res) => {
    const {short_url} = req.params;

    db.all('SELECT url FROM shorts WHERE id = ?', [short_url], (err, rows) => {
      if (err)
        return res.status(500).json({message: 'Server error'});

      const [row] = rows;

      const {url} = row;

      res.redirect(url);
    })
  });

app.listen(port, () => console.log(`Listen on port ${port}`));
