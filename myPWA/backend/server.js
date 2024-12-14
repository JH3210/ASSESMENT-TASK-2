const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Set up SQLite database for users
const dbPathUsers = path.join(__dirname, 'database', 'account_log.db');
const dbPathTweets = path.join(__dirname, 'database', 'tweets.db');

// Create and connect to users database
const dbUsers = new sqlite3.Database(dbPathUsers, (err) => {
    if (err) {
        console.error('Error opening users database:', err);
    } else {
        console.log('Connected to account_log.db');
        dbUsers.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);
    }
});

// Create and connect to tweets database
const dbTweets = new sqlite3.Database(dbPathTweets, (err) => {
    if (err) {
        console.error('Error opening tweets database:', err);
    } else {
        console.log('Connected to tweets.db');
        dbTweets.run(`CREATE TABLE IF NOT EXISTS tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// User Signup Endpoint
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    dbUsers.run(`INSERT INTO users (username, password) VALUES (?, ?)`, 
        [username, hashedPassword], 
        function(err) {
            if (err) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            res.status(201).json({ id: this.lastID, username });
        }
    );
});

// User Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    dbUsers.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            res.status(200).json({ message: `Login successful`, username });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    });
});

// Create a new tweet Endpoint
app.post('/api/tweets', (req, res) => {
    const { username, content } = req.body;

    if (!content || !username) {
        return res.status(400).json({ error: 'Content and username are required' });
    }

    dbTweets.run('INSERT INTO tweets (username, content) VALUES (?, ?)', 
        [username, content], 
        function(err) {
            if (err) {
                console.error('Tweet insertion error:', err);
                return res.status(500).json({ error: 'Error creating tweet' });
            }
            res.status(201).json({ 
                id: this.lastID, 
                username, 
                content, 
                created_at: new Date().toISOString() 
            });
        }
    );
});

// Get all tweets Endpoint
app.get('/api/tweets', (req, res) => {
    dbTweets.all('SELECT * FROM tweets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Tweets retrieval error:', err);
            return res.status(500).json({ error: 'Error retrieving tweets' });
        }
        res.status(200).json(rows);
    });
});

// Get a single tweet by ID
app.get('/api/tweets/:id', (req, res) => {
    const { id } = req.params;
    dbTweets.get('SELECT * FROM tweets WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).send('Error retrieving tweet');
        } else if (!row) {
            res.status(404).send('Tweet not found');
        } else {
            res.status(200).json(row);
        }
    });
});

// Delete a tweet
app.delete('/api/tweets/:id', (req, res) => {
    const { id } = req.params;
    dbTweets.run(`DELETE FROM tweets WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).send('Error deleting tweet');
        } else if (this.changes === 0) {
            res.status(404).send('Tweet not found');
        } else {
            res.status(200).send('Tweet deleted successfully');
        }
    });
});

// Update tweet endpoint
app.put('/api/tweets/:id', (req, res) => {
    const { id } = req.params;
    const { content, username } = req.body;

    if (!content || !username) {
        return res.status(400).json({ error: 'Content and username are required' });
    }

    dbTweets.run(
        'UPDATE tweets SET content = ? WHERE id = ? AND username = ?',
        [content, id, username],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error updating tweet' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tweet not found or unauthorized' });
            }
            // Return the updated tweet data
            dbTweets.get('SELECT * FROM tweets WHERE id = ?', [id], (err, tweet) => {
                if (err) {
                    return res.status(500).json({ error: 'Error retrieving updated tweet' });
                }
                res.status(200).json(tweet);
            });
        }
    );
});

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/welcome.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});