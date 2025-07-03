const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

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
            password TEXT,
            role TEXT DEFAULT 'user'
        )`);
    }
});

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

app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;

    // Password validation 
    const passwordRequirements = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRequirements.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long, contain at least one uppercase letter, and one symbol.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Only the username 'admin' with password 'admin123' gets admin role, all others are user
    let role = 'user';
    if (username === 'admin' && password === '$2b$10$W50Ctp9OoKu0A36f47tcu.8Ku27kg6l.Glam63wYDc9SpplN7eyGC') {
        role = 'admin';
    }
    dbUsers.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
        [username, hashedPassword, role], 
        function(err) {
            if (err) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            res.status(201).json({ id: this.lastID, username, role });
        }
    );
});
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    dbUsers.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            res.status(200).json({ message: `Login successful`, username, role: user.role });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    });
});

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

// Get tweets
app.get('/api/tweets', (req, res) => {
    dbTweets.all('SELECT * FROM tweets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Tweets retrieval error:', err);
            return res.status(500).json({ error: 'Error retrieving tweets' });
        }
        res.status(200).json(rows);
    });
});

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

app.delete('/api/tweets/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    dbUsers.get('SELECT username, password FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(403).json({ error: 'User not found' });
        }
        dbTweets.get('SELECT * FROM tweets WHERE id = ?', [id], (err, tweet) => {
            if (err || !tweet) {
                return res.status(404).json({ error: 'Post not found' });
            }
            // Only allow if admin (username: admin, password: admin123) or tweet owner
            const isAdmin = user.username === 'admin' && bcrypt.compareSync('admin123', user.password);
            if (isAdmin || tweet.username === username) {
                dbTweets.run(`DELETE FROM tweets WHERE id = ?`, id, function(err) {
                    if (err) {
                        res.status(500).send('Error deleting Post');
                    } else if (this.changes === 0) {
                        res.status(404).send('Post not found');
                    } else {
                        res.status(200).send('Post deleted successfully');
                    }
                });
            } else {
                res.status(403).json({ error: 'Not authorized to delete this post' });
            }
        });
    });
});

app.put('/api/tweets/:id', (req, res) => {
    const { id } = req.params;
    const { content, username } = req.body;

    if (!content || !username) {
        return res.status(400).json({ error: 'Content and username are required' });
    }

    dbUsers.get('SELECT username, password FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(403).json({ error: 'User not found' });
        }
        dbTweets.get('SELECT * FROM tweets WHERE id = ?', [id], (err, tweet) => {
            if (err) {
                console.error('Tweet lookup error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (!tweet) {
                return res.status(404).json({ error: 'Post not found' });
            }
            // Only allow if admin (username: admin, password: admin123) or tweet owner
            const isAdmin = user.username === 'admin' && bcrypt.compareSync('admin123', user.password);
            if (isAdmin || tweet.username === username) {
                dbTweets.run(
                    'UPDATE tweets SET content = ? WHERE id = ?',
                    [content, id],
                    function(err) {
                        if (err) {
                            console.error('Tweet update error:', err);
                            return res.status(500).json({ error: 'Error updating post' });
                        }
                        dbTweets.get('SELECT * FROM tweets WHERE id = ?', [id], (err, updatedTweet) => {
                            if (err) {
                                return res.status(500).json({ error: 'Error retrieving updated post' });
                            }
                            res.status(200).json(updatedTweet);
                        });
                    }
                );
            } else {
                res.status(403).json({ error: 'Not authorized to edit this post' });
            }
        });
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Like a tweet
app.post('/api/tweets/:id/like', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    // Check if the user has already liked the tweet
    dbTweets.get('SELECT * FROM likes WHERE tweet_id = ? AND username = ?', [id, username], (err, like) => {
        if (err) {
            console.error('Error checking likes:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (like) {
            return res.status(400).json({ error: 'You have already liked this tweet' });
        }

        // increment like count and add to likes table
        dbTweets.run('INSERT INTO likes (tweet_id, username) VALUES (?, ?)', [id, username], (err) => {
            if (err) {
                console.error('Error adding like:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            dbTweets.run('UPDATE tweets SET likes = likes + 1 WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error('Error updating likes:', err);
                    return res.status(500).json({ error: 'Error updating tweet likes' });
                }

                res.status(200).json({ message: 'Tweet liked successfully' });
            });
        });
    });
});
