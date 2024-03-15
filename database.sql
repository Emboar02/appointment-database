CREATE TABLE calendar (
    uid varchar(255),
    dtstart varchar(255),
    dtstamp varchar(255),
    method varchar(255),
    status varchar(255),
    attendee varchar(255)
);

INSERT INTO calendar (uid, dtstart, dtstamp, method, status, attendee)
VALUES ("5672nnfdkd", "20240506T121212", "20240308T161616", "REQUEST", "CONFIRMED", "test@gmail.com");

INSERT INTO calendar (uid, dtstart, dtstamp, method, status, attendee)
VALUES ("a93kch2mme", "20240514T121212", "20240308T161616", "REQUEST", "CONFIRMED", "thisisatest@gmail.com");

INSERT INTO calendar (uid, dtstart, dtstamp, method, status, attendee)
VALUES ("p1pd8xyn5n", "20240411T121212", "20240308T161616", "REQUEST", "CONFIRMED", "yahoo@hotmail.com");

INSERT INTO calendar (uid, dtstart, dtstamp, method, status, attendee)
VALUES ("t0yjsk5jw7", "20240809T121212", "20240308T161616", "REQUEST", "CANCELLED", "fake@hotmail.com");