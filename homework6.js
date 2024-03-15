const http = require("http"); 
const querystr = require("querystring");
const mysql = require("mysql");

const dBCon = mysql.createPool({ // MySQL database
    connectionLimit: 10,
    host: "insert_host_here",
    user: "insert_username_here",
    password: "insert_password_here",
    database: "insert_database_here"
});

const tableName = "calendar";
let takenDates = [];

const server = http.createServer(async (req, res) => {
    const connection = await new Promise((resolve, reject) => {
        dBCon.getConnection((err, conn) => {
            if (err) reject(err);
            else resolve(conn);
        });
    });
    const sqlquery = `SELECT dtstart, status FROM ${tableName}`;
    connection.query(sqlquery, (error, results, fields) => {
        if (error) {
            console.error("Error executing SQL query: " + error.stack);
        }
        results.forEach(row => {
            if (!takenDates.includes(row.dtstart) && row.status != "CANCELLED") {
                takenDates.push(row.dtstart);
            } 
        });
    });

    
    if (req.method === "GET") {
        const contentType = req.headers["content-type"];
        const supportedContentType = "application/json";
        if (supportedContentType == contentType) {
            let requestBody = "";

            await new Promise((resolve) => {
                req.on("data", (chunk) => {
                requestBody += chunk;
                });

                req.on("end", resolve);
            });
            try {
                // Parse the request body based on the Content-Type
                requestBody = JSON.parse(requestBody);
                let keys = [];
                for (var k in requestBody) {
                    keys.push(k);
                }
                if (keys.includes("start-date") && keys.includes("end-date") && keys.includes("N")) {
                    let startDate = requestBody["start-date"];
                    let endDate = requestBody["end-date"];
                    let numberOfDates = requestBody["N"];
                    let possibleDates = findDate(startDate, endDate, numberOfDates, takenDates);
                    if (possibleDates != -1) {
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: true, data: possibleDates}));
                    } else {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: false, data: "No possible dates." }));
                    }
                } else if (keys.includes("uid")) {
                    let uid = requestBody["uid"];
                    let sqlquery = `SELECT * FROM ${tableName} WHERE uid = "${uid}";`;
                    connection.query(sqlquery, (error, results, fields) => {
                        if (error) {
                            console.error("Error executing SQL query: " + error.stack);
                        }
                        if (results[0]["status"] != "CANCELLED") {
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, data: results}));
                        } else {
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "event is cancelled"}));
                        }
                        
                    });
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "Right information was not given."}));
                }
            } catch (error) {
                // Handle parsing error
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: `Data cannot be parsed` }));
            }
        }
    } else if (req.method === "POST") {
        // Check the Content-Type header
        const contentType = req.headers["content-type"];
        // Supported content types
        const supportedContentTypes = ["application/json"];

        if (supportedContentTypes.includes(contentType)) {
            const connection = await new Promise((resolve, reject) => {
                dBCon.getConnection((err, conn) => {
                    if (err) reject(err);
                    else resolve(conn);
                });
            });
            let requestBody = "";

            await new Promise((resolve) => {
                req.on("data", (chunk) => {
                requestBody += chunk;
                });

                req.on("end", resolve);
            });

            let dataType = "";
            try {
                // Parse the request body based on the Content-Type
                dataType = "JSON";
                requestBody = JSON.parse(requestBody);
                let keys = [];
                for (var k in requestBody) {
                    keys.push(k);
                }
                if (keys.includes("dtstart") && keys.includes("method") && keys.includes("attendee")) {
                    const uid = generateRandomCode();
                    const todayDate = new Date();
                    let dtstart = createDate(requestBody["dtstart"]);
                    let sameDate = false;
                    if (dtstart != -1) {
                        for (var i in takenDates) {
                            let tempDate = createDate(takenDates[i]);
                            if (tempDate.getDate() == dtstart.getDate() && tempDate.getMonth() == dtstart.getMonth()
                            && tempDate.getFullYear() == dtstart.getFullYear()) {
                                sameDate = true;
                                res.writeHead(400, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: false, error: `Date is already taken.` }));
                            }
                        }
                        if (sameDate == false) {
                            const sqlquery = `
                            INSERT INTO ${tableName} (uid, dtstart, dtstamp, method, status, attendee)
                            VALUES (?, ?, ?, ?, 'CONFIRMED', ?);`;
        
                            connection.query(sqlquery, [uid, createUnparsedDate(dtstart), createUnparsedDate(todayDate), requestBody["method"], requestBody["attendee"]], (error, results, fields) => {
                                if (error) {
                                    console.error("Error executing SQL query: " + error.stack);
                                }
                            });
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, data: requestBody }));
                        }
                    } else {
                        res.writeHead(400,  { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: false, error: "Invalid date" }));
                    }
                    
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: `Not enough data to make appointment.` }));
                }

            } catch (error) {
                console.log(error);
                // Handle parsing error
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: `${dataType} data cannot be parsed` }));
            } finally {
                connection.release();
            }
        } else {
            // Notify the client about unsupported Content-Type
            res.writeHead(415, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Unsupported Content-Type" }));
        }
    } else if (req.method === "DELETE") {
        const contentType = req.headers["content-type"];
        // Supported content types
        const supportedContentTypes = ["application/json"];
        if (supportedContentTypes.includes(contentType)) {
            let requestBody = "";
            await new Promise((resolve) => {
                req.on("data", (chunk) => {
                requestBody += chunk;
                });
    
                req.on("end", resolve);
            });
    
            let checkForThisUid = null;
            let valid = true;
            try {
                requestBody = JSON.parse(requestBody);
                if (requestBody["uid"] != null) {
                    checkForThisUid = requestBody["uid"];
                } else {
                    valid = false;
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "no uid given"}));
                }
            } catch (error) {
                valid = false;
                // Handle parsing error
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: `Data cannot be parsed` }));
            }
            const connection = await new Promise((resolve, reject) => {
                dBCon.getConnection((err, conn) => {
                    if (err) reject(err);
                    else resolve(conn);
                });
            });
            if (valid == true) {
                try {
                    let currentuids = [];
                    const sqlquery = `SELECT uid FROM ${tableName}`;
                    let updatesql = null;
                    connection.query(sqlquery, (error, results, fields) => {
                        if (error) {
                            console.error("Error executing SQL query: " + error.stack);
                        }
                        results.forEach(row => {
                            currentuids.push(row.uid);
                        });
                        for (var i in currentuids) {
                            if (currentuids[i] == checkForThisUid) {
                                updatesql = `UPDATE ${tableName}
                                SET status = "CANCELLED"
                                WHERE uid = "${currentuids[i]}";`;
                            }
                        }
                        if (updatesql != null) {
                            connection.query(updatesql, (error, results, fields) => {
                                if (error) {
                                    console.error("Error executing SQL query: " + error.stack);
                                }
                            });
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, data: "event has been cancelled"}));
                        } else {
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "did not give a valid uid"}));
                        }
                    });
                    
                } catch (error) {
                    // Handle parsing error
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "Parsing error for cancelling event"}));
                } finally {
                    connection.release();
                }
            }
        } else {
            res.writeHead(415, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Unsupported Content-Type" }));
        }
    } else {
        res.writeHead(405, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ success: false, error: "Unsupported Method-Type" }));
    }
    
});

// For testing purposes
// module.exports = server.listen(3000);

const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});


function findDate(startDate, endDate, N, takenDates) {
    let newYears = new Date(2024, 1, 1);
    let independence = new Date(2024, 7, 4);
    let thanksgiving = new Date(2024, 11, 28);
    let christmas = new Date(2024, 12, 25);
    let holidays = [newYears, independence, thanksgiving, christmas];
    let startDateParsed = createDate(startDate);
    let endDateParsed = createDate(endDate);
    if (N < 1 || N > 4) {
        return -1;
    }
    if (startDateParsed == -1 || endDateParsed == -1) {
        console.log("Please input a valid date.");
        return -1;
    }
    if (endDateParsed < startDateParsed) {
        console.log("Please input an end date after the start date");
        return -1;
    }
    let todayDate = new Date();
    if (startDateParsed.getHours() < 8 || startDateParsed.getHours() > 17) {
        console.log("Please input a time between 8 AM and 5 PM");
        return -1;
    } else if (startDateParsed.getTime() < todayDate.getTime() || endDateParsed.getTime() < todayDate.getTime()) {
        console.log("Please input a date after today.");
        return -1;
    } 
    let checkDate = new Date(startDateParsed.getTime());
    let possibleDates = [];
    let sameDay = false;
    let holiday = false;
    while (checkDate <= endDateParsed) {
        sameDay = false;
        holiday = false;
        let tempDate = new Date(checkDate.getTime());
        for (j = 0; j < takenDates.length; j++) {
            if (takenDates[j].getDate() == tempDate.getDate() && takenDates[j].getMonth() == tempDate.getMonth()
            && takenDates[j].getFullYear() == tempDate.getFullYear()) {
                sameDay = true;
            }
        }
        for (k = 0; k < holidays.length; k++) {
            if (holidays[k].getDate() == tempDate.getDate() && holidays[k].getMonth() == tempDate.getMonth()
            && holidays[k].getFullYear() == tempDate.getFullYear()) {
                holiday = true;
            }
        }
        if (sameDay != true && holiday != true && tempDate.getDay() != 0 && 
            tempDate.getDay() != 6 && possibleDates.length != N) {
            possibleDates.push(tempDate);
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }
    if (possibleDates.length > 0) {
        return possibleDates;
    }
    return -1;
}

function createDate(unparsedDate) {
    if (unparsedDate.length != 15 || unparsedDate.charAt(8) != "T") {
        // checking whether length of string is valid and the middle letter is a T
        return -1;
    } else {
        let year = unparsedDate.substring(0, 4);
        let month = unparsedDate.substring(4, 6);
        let day = unparsedDate.substring(6, 8);
        let hour = unparsedDate.substring(9, 11);
        let minute = unparsedDate.substring(11, 13);
        let second = unparsedDate.substring(13, 15);
        if (checkValidDate(year, month, day, hour, minute, second)) {
            let date = new Date(year, month - 1, day, hour, minute, second);
            date.setFullYear(year); // this is because double digit years can be misinterpreted
            return date; 
        } else {
            return -1; // not a valid date
        }
    }
}

// for adding date to database file
function createUnparsedDate(parsedDate) {
    let year = parsedDate.getFullYear();
    let month = parsedDate.getMonth()+1;
    let day = parsedDate.getDate();
    let hour = parsedDate.getHours();
    let minute = parsedDate.getMinutes();
    let second = parsedDate.getSeconds();
    let unparsedDate = "";
    let unparsedTime = "";
    let date = "";
    if (day < 10 && month < 10) {
        unparsedDate = `${year}0${month}0${day}`;
    } else if (day < 10) {
        unparsedDate = `${year}${month}0${day}`;
    } else if (month < 10) {
        unparsedDate = `${year}0${month}${day}`;
    } else {
        unparsedDate = `${year}${month}${day}`;
    }
    if (hour < 10 && minute < 10 && second < 10) {
        unparsedTime = `0${hour}0${minute}0${second}`;
    } else if (hour < 10 && minute < 10) {
        unparsedTime = `0${hour}0${minute}${second}`;
    } else if (hour < 10 && second < 10) {
        unparsedTime = `0${hour}${minute}0${second}`;
    } else if (minute < 10 && second < 10) {
        unparsedTime = `${hour}0${minute}0${second}`;
    } else {
        unparsedTime = `${hour}${minute}${second}`;
    }
    date = `${unparsedDate}T${unparsedTime}`
    return date;
}

function generateRandomCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomID = "";
  
    for (i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomID += characters.charAt(randomIndex);
    }
    return randomID;
}

function checkValidDate(year, month, day, hour, minute, second) {
    if (year < 0 || year > 9999) {
        return false;
    }
    if (month < 1 || month > 12) {
        return false;
    }
    if (day < 1 || day > 31) {
        return false;
    }

    // only certain months can have 31 days
    if ((month == 2 || month == 4 || month == 6 || month == 9 || month == 11) && day == 31) {
        return false;
    }

    // leap year check
    if (month == 2 && day > 29) {
        return false;
    } else if (month == 2 && day == 29 && checkLeapYear(year) == false) {
        return false;
    }

    if (hour < 0 || hour > 24) {
        return false;
    }

    if (minute < 0 || minute > 59) {
        return false;
    }

    if (second < 0 || second > 59) {
        return false;
    }
    return true;
}

// Checks whether year is a leap year
function checkLeapYear(year) {
    if (year % 4 == 0){
        if (year % 100 == 0){
            if (year % 400 == 0){
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }
    return false;
}