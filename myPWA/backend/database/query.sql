
CREATE TABLE IF NOT EXISTS tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


   SELECT * FROM tweets ORDER BY created_at DESC;


   CREATE TABLE IF NOT EXISTS tweets (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       content TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );



SELECT * FROM tweets WHERE id = 1;  

   SELECT * FROM tweets;
ALTER TABLE tweets ADD COLUMN likes INTEGER DEFAULT 0;


CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    UNIQUE(tweet_id, username),
    FOREIGN KEY(tweet_id) REFERENCES tweets(id)
);



PRAGMA foreign_keys = OFF