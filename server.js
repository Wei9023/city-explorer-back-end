'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();

//Cache Timeouts
const timeouts = {
    weather: 15 * 1000,
    yelp: 24 * 1000 * 60 * 60,
    movies: 30 * 1000 * 60 * 60,
    meetups: 6 * 1000 * 60 * 60,
    trails: 7 * 100 * 60 * 60 *24,
}

// Application Setup
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));


// API Routes
app.get('/location', getLocation);

// Do not comment in until you have locations in the DB
app.get('/weather', getWeather);

// Do not comment in until weather is working
app.get('/meetups', getMeetups);

app.get('/movies', getMovies);

app.get('/yelp', getYelp);

app.get('/trails', getTrails);



// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// Error handler
function handleError(err, res) {
    console.error(err);
    if (res) res.status(500).send('Sorry, something went wrong');
}

// Look for the results in the database
function lookup(options) {
    const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
    const values =[options.location];

    client.query(SQL, values)
        .then(result => {
            if(result.rowCount > 0) {
                options.cacheHit(result);
            } else {
                options.cacheMiss();
            }
        })
        .catch(error => handleError(error));
}

//clear the results for the location 
function deleteBylocationId(table, city) {
    const SQL = `DELETE from ${table} WHERE location_id=${city};`;
    return client.query(SQL);
}

// *********************
// MODELS
// *********************

function Location(query, res) {
  this.tableName = 'locations';
  this.search_query = query;
  this.formatted_query = res.body.results[0].formatted_address;
  this.latitude = res.body.results[0].geometry.location.lat;
  this.longitude = res.body.results[0].geometry.location.lng;
  this.created_at = Date.now();
}

Location.lookupLocation = (location) => {
    const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
    const values = [location.query];

    return client.query( SQL, values)
        .then(result => {
            if(result.rowCount > 0) {
                location.cacheHit(result);
            } else {
                location.cacheMiss();
            }
        })
        .catch(console.error);
}

Location.prototype = {
    save: function() {
        const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude)
                    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
        const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];

        return client.query(SQL, values)
            .then(result => {
                this.id = result.rows[0].id;
                return this;     
            });
    }
}

function Weather(day) {
  this.tableName ='weathers';
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.created_at = Date.now();
}

Weather.tableName = 'weathers';
Weather.lookup = lookup;
Weather.deleteBylocationId = deleteBylocationId;

Weather.prototype = {
    save:function(location_id) {
        const SQL = `INSERT INTO ${this.tableName} (forecast, time, created_at, location_id) VALUES
                    ($1, $2, $3, $4);`;
        const values =[this.forecast, this.time, this.created_at, location_id];

        client.query(SQL, values);
    }
}

function Meetup(meetup) {
  this.tableName = 'meetups';
  this.link = meetup.link;
  this.name = meetup.group.name;
  this.creation_date = new Date(meetup.group.created).toString().slice(0, 15);
  this.host = meetup.group.who;
  this.created_at = Date.now();
}
Meetup.tableName = 'meetups';
Meetup.lookup = lookup;
Meetup.deleteBylocationId = deleteBylocationId;

Meetup.prototype = {
    save: function(location_id) {
        const SQL = `INSERT INTO ${this.tableName} (link, name, creation_date, host, created_at, location_id) VALUES
                    ($1, $2, $3, $4, $5, $6);`;
        const values = [this.link, this.name, this.creation_date, this.host, this.created_at, location_id]

        client.query(SQL, values);
    }
}

function Movie(movie) {
    this.tableName='movies';
    this.title = movie.title;
    this.overview = movie.overview;
    this.average_votes = movie.vote_average;
    this.image_url = 'https://image.tmdb.org/t/p/w500' + movie.poster_path || 'http://i.imgur.com/J5LVHEL.jpg';
    this.popularity = movie.popularity;
    this.released_on = movie.released_date;
    this.created_at = Date.now();
}

Movie.tableName = 'movies';
Movie.lookup = lookup;
Movie.deleteBylocationId = deleteBylocationId;

Movie.prototype = {
    save: function(location_id){
        const SQL = `INSERT INTO ${this.tableName} (title, overview, average_votes, image_url, popularity, 
            released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
        const values = [this.title, this.overview, this.average_votes, this.image_url, this.popularity, this.released_on, this.created_at, location_id];

        client.query(SQL, values);
    }    
}


function Yelp(business) {
    this.tableName = 'yelps';
    this.name = business.name;
    this.image_url = business.image_url;
    this.price = business.price;
    this.rating = business.rating;
    this.url = business.url;
    this.created_at = Date.now();
}

Yelp.tableName = 'yelp';
Yelp.lookup = lookup;
Yelp.deleteBylocationId = deleteBylocationId;

Yelp.prototype ={
    save : function (location_id) {
        const SQL = `INSERT INTO ${this.tableName} (name, image_url, price, rating, url, created_at, location_id) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7);`;
        const values = [this.name, this.image_url, this.price, this.rating, this.url, this.created_at, location_id];

        client.query(SQL, values);  
    }
}

function Trail(trail){
    this.tableName ='trails';
    this.name = trail.name;
    this.location = trail.location;
    this.length = trail.length;
    this.stars = trail.stars;
    this.star_votes = trail.starVotes;
    this.summary = trail.summary;
    this.trail_url = trail.url;
    this.condition = trail.conditionStatus;
    this.condition_date = trail.conditionDate.slice(0,10);
    this.condition_time = trail.conditionDate.slice(11);
    this.created_at = Date.now();
}

Trail.tableName ='trails';
Trail.lookup = lookup;
Trail.deleteBylocationId = deleteBylocationId;

Trail.prototype ={
    save : function (location_id) {
        const SQL = `INSERT INTO ${this.tableName} (name, location, length, stars, star_votes, summary, trail_url, 
                    condition, condition_date, condition_time, location_id) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`;
        const values = [this.name, this.location, this.length, this.stars, this.star_votes, this.summary, 
                    this.trail_url, this.condition, this.condition_date, this.condition_time, location_id];

        client.query(SQL, values);  
    }
}

// *********************
// HELPER FUNCTIONS
// *********************



function getLocation(request, response) {
    
    Location.lookupLocation({
        tableName : Location.tableName,

        query: request.query.data,
        cacheHit: function(result) {
            response.send(result.rows[0]);
        },

        cacheMiss: function() {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`;
            
            return superagent.get(url)
                .then(result => {
                    const location = new Location(this.query, result);
                    location.save()
                        .then(location => response.send(location));
                })
                .catch(error => handleError(error));
            }
         })
    }
        

function getWeather(request, response) {
  Weather.lookup({
      tableName: Weather.tableName,

      location: request.query.data.id,

      cacheHit: function (result) {
          let ageOfResults = (Date.now() - result.rows[0].created_at);
          if (ageOfResults > timeouts.weather){
              Weather.deleteBylocationId(Weather.tableName, request.query.data.id);
              this.cacheMiss();
          } else {
              response.send(result.rows);
          }
      },
      cacheMiss: function () {
          const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

          return superagent.get(url)
            .then(result => {
                const weatherSummaries = result.body.daily.data.map(day => {
                    const summary = new Weather(day);
                    summary.save(request.query.data.id);
                    return summary;
                });
                response.send(weatherSummaries);
            })
            .catch(error => handleError(error, response));
      }
  })
}  


function getMeetups(request, response) {
    Meetup.lookup({
        tableName: Meetup.tableName,
        location: request.query.data.id,

        cacheHit: function(result) {
            let ageOfResults = (Date.now() - result.rows[0].created_at);
                if (ageOfResults > timeouts.meetups){
                    meetup.deleteBylocationId(Meetup.tableName, request.query.data.id);
                    this.cacheMiss();
                } else {
                    response.send(result.rows);
                }
            },
        cacheMiss: function () {
            const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`
  
            return superagent.get(url)
                .then(result => {
                    const meetupSummaries = result.body.events.map(event => {
                    const summary = new Meetup(event);
                        summary.save(request.query.data.id);
                        return summary;
                    });
                    response.send(meetupSummaries);
                })
            .catch(error => handleError(error, response));
        }
    })
}


function getMovies(request, response) {
    Movie.lookup({
        tableName: Movie.tableName,
        location: request.query.data.id,

        cacheHit: function(result) {
            let ageOfResults = (Date.now() - result.rows[0].created_at);
                if (ageOfResults > timeouts.movies){
                    movie.deleteBylocationId(Movie.tableName, request.query.data.id);
                    this.cacheMiss();
                } else {
                    response.send(result.rows);
                }
        },
        cacheMiss: function () {
            const url = `https://api.themoviedb.org/3/search/movie/?api_key=${process.env.MOVIE_API_KEY}&language=en-US&page=1&query=${request.query.data.search_query}`
  
            return superagent.get(url)
                .then(result => {
                    const moviesSummaries = result.body.results.map(movie => {
                    const result = new Movie(movie);
                        result.save(request.query.data.id);
                        return result;
                    });
                    response.send(moviesSummaries);
                })
            .catch(error => handleError(error, response));
        }
    })
}


function getYelp(request, response) {
    Yelp.lookup({
        tableName: Yelp.tableName,
        location: request.query.data.id,

        cacheHit: function(result) {
            let ageOfResults = (Date.now() - result.rows[0].created_at);
                if (ageOfResults > timeouts.yelp){
                    Yelp.deleteBylocationId(Yelp.tableName, request.query.data.id);
                    this.cacheMiss();
                } else {
                    response.send(result.rows);
                }
        },
        cacheMiss: function () {
            const url = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`
            console.log(url);
            return superagent.get(url)
                .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
                
                .then(result => {
                    const yelpSummaries = result.body.businesses.map(business => {
                            // console.log('378',result.body);
                    const resultx = new Yelp(business);
                        resultx.save(request.query.data.id);
                        return resultx;
                    });
                    response.send(yelpSummaries);
                })
            .catch(error => handleError(error, response));
        }
    })
}

function getTrails(request, response) {
    Trail.lookup({
        tableName: Trail.tableName,
        location: request.query.data.id,

        cacheHit: function(result) {
            let ageOfResults = (Date.now() - result.rows[0].created_at);
                if (ageOfResults > timeouts.trails){
                    Trail.deleteBylocationId(Trail.tableName, request.query.data.id);
                    this.cacheMiss();
                } else {
                    response.send(result.rows);
                }
        },
        cacheMiss: function () {
            const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&maxDistance=10&key=${process.env.TRAIL_API_KEY}`
            
            console.log(url);
            return superagent.get(url)
                .then(result => {
                    const trailsSummaries = result.body.trails.map(trail => {
                    const result = new Trail(trail);
                        result.save(request.query.data.id);
                        return result;
                    });
                    response.send(trailsSummaries);
                })
            .catch(error => handleError(error, response));
        }
    })
}

