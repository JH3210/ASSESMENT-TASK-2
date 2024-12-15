let isEditMode = false; 
let editId = null; 
let allTweets = []; 
let currentFilter = 'all';

async function loadTweets() {
    try {
        const response = await fetch('http://localhost:3001/api/tweets');
        if (!response.ok) {
            throw new Error('Failed to fetch tweets');
        }
        allTweets = await response.json(); // Store all tweets
        displayTweets();  
    } catch (error) {
        console.error('Error loading tweets:', error);
        alert('Failed to load tweets');
    }
}

// Function to handle tweet submission
async function addTweet(event) {
    event.preventDefault();
    const content = document.querySelector('.tweet-input').value.trim();
    const username = localStorage.getItem('username');

    if (!content) {
        alert('Please enter a tweet');
        return;
    }

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `http://localhost:3001/api/tweets/${editId}` : 'http://localhost:3001/api/tweets';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, content }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to process request');
        }

        document.querySelector('.tweet-input').value = ''; // Clear input
        loadTweets(); // Reload tweets
        switchToAddMode(); // Reset to add mode
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error processing request');
    }
}

// Function to switch to "Add" mode
function switchToAddMode() {
    isEditMode = false;
    editId = null;
    document.querySelector('.tweet-button').textContent = 'Tweet';
    document.querySelector('.tweet-input').value = ''; // Clear the input
}

// Function to edit a tweet
function editTweet(id) {
    // Fetches the current tweet data
    fetch(`http://localhost:3001/api/tweets/${id}`)
        .then(response => response.json())
        .then(data => {
            // Populates form with existing data
            document.querySelector('.tweet-input').value = data.content;

            // Switches to edit mode
            isEditMode = true;
            editId = id;
            document.querySelector('.tweet-button').textContent = 'Update Tweet';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error fetching tweet');
        });
}

// Function to delete a tweet
async function deleteTweet(id) {
    if (confirm('Are you sure you want to delete this tweet?')) {
        try {
            const response = await fetch(`http://localhost:3001/api/tweets/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                console.log('Tweet deleted');
                loadTweets(); // Reload the list of tweets
            } else {
                throw new Error('Error deleting tweet');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting tweet');
        }
    }
}

// Add new function to handle filtering
function filterTweets() {
    currentFilter = document.getElementById('tweetFilter').value;
    displayTweets();
}


function displayTweets() {
    const currentUsername = localStorage.getItem('username');
    const tweetFeed = document.querySelector('.tweet-feed');
    tweetFeed.innerHTML = ''; // Clear existing tweets

    const tweetsToShow = currentFilter === 'mine'
        ? allTweets.filter(tweet => tweet.username === currentUsername)
        : allTweets;

    tweetsToShow.forEach(tweet => {
        const tweetElement = document.createElement('div');
        tweetElement.className = 'tweet';

        const likeButton = `
            <button onclick="likeTweet(${tweet.id})" class="like-button">Like (${tweet.likes || 0})</button>
        `;

        const actionButtons = tweet.username === currentUsername ? `
            <button onclick="editTweet(${tweet.id})">Edit</button>
            <button onclick="deleteTweet(${tweet.id})">Delete</button>
        ` : '';

        tweetElement.innerHTML = `
            <div class="tweet-header">
                <span class="tweet-author">${tweet.username}</span>
                <span class="tweet-time">${new Date(tweet.created_at).toLocaleString('en-AU', {
                    timeZone: 'Australia/Sydney',
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })}</span>
            </div>
            <div class="tweet-content">${tweet.content}</div>
            <div class="tweet-actions">
                ${likeButton}
                ${actionButtons}
            </div>
        `;
        tweetFeed.appendChild(tweetElement);
    });
}


// Function to like a tweet
async function likeTweet(tweetId) {
    const username = localStorage.getItem('username');
    if (!username) {
        alert('You must be logged in to like tweets.');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/tweets/${tweetId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username }),
        });

        if (response.ok) {
            loadTweets(); // Reload tweets to update like count
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Error liking tweet');
        }
    } catch (error) {
        console.error('Error liking tweet:', error);
        alert('Error liking tweet');
    }
}



// Add this new function
function logout() {
    // Clear the stored username
    localStorage.removeItem('username');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'login.html';
    } else {
        loadTweets(); // Load tweets when the page loads
        // Update welcome message with username
        document.getElementById('welcomeUser').textContent = username;
    }

    document.querySelector('.tweet-button').addEventListener('click', addTweet);
    document.getElementById('tweetFilter').addEventListener('change', filterTweets);
});

