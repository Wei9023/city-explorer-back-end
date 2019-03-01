DROP TABLE weathers, meetups, movies, yelp, trails, locations;

CREATE TABLE IF NOT EXISTS locations (
    id  SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude  NUMERIC(8,6),
    longitude  NUMERIC(9,6)
);

CREATE TABLE IF NOT EXISTS weathers (
    id  SERIAL PRIMARY KEY,
    forecast VARCHAR(255),
    time VARCHAR(255),
    created_at VARCHAR(255),
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS meetups (
    id  SERIAL PRIMARY KEY,
    link VARCHAR(255),
    name VARCHAR(255),
    creation_date CHAR(15),
    host VARCHAR(255),
    created_at VARCHAR(255),
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS movies (
    id  SERIAL PRIMARY KEY,
    title VARCHAR(255),
    overview TEXT,
    average_votes CHAR(15), 
    image_url VARCHAR(255),
    popularity NUMERIC(8,6),
    released_on VARCHAR(255),
    created_at VARCHAR(255),
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS yelp (
    id  SERIAL PRIMARY KEY,
    name VARCHAR(255),
    image_url VARCHAR(255),
    price CHAR(15),
    rating CHAR(15),
    url VARCHAR(255),
    created_at VARCHAR(255),
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS trails (
    id  SERIAL PRIMARY KEY,
    name VARCHAR(255),
    location VARCHAR(255),
    length NUMERIC(9,6),
    stars CHAR(15),
    star_votes CHAR(15),
    summary VARCHAR(255),
    trail_url VARCHAR(255),
    condition VARCHAR(255),
    condition_date VARCHAR(255),
    condition_time VARCHAR(255), 
    created_at VARCHAR(255),
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);