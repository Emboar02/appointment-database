const supertest = require("supertest");
const server = require("./homework6.js");
const request = supertest(server);

afterAll(() => {
    server.close();
});

test("Can look up N dates", async () => {
    const testData = { "start-date": "20240406T121212", "end-date": "20240506T121212", "N":3 };
    const expected = { success: true, data: [
        "2024-04-08T16:12:12.000Z",
        "2024-04-09T16:12:12.000Z",
        "2024-04-10T16:12:12.000Z"
    ]};
    const response = await request.get("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expected);
});

test("Can make valid appointment", async () => {
    const testData = { "dtstart": "20240408T161212", "method": "REQUEST", "attendee": "test2@gmail.com" };
    const expected = { success: true, data: {
        "dtstart": "20240408T161212",
        "method": "REQUEST",
        "attendee": "test2@gmail.com"
    }};
    const response = await request.post("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expected);
});

test("Can lookup valid appointment", async () => {
    const testData = { "uid": "5672nnfdkd" };
    const expected = { success: true, data: [
        {
            "uid": "5672nnfdkd",
            "dtstart": "20240506T121212",
            "dtstamp": "20240308T161616",
            "method": "REQUEST",
            "status": "CONFIRMED",
            "attendee": "test@gmail.com"
        }
    ]};
    const response = await request.get("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expected);
});

test("Can delete valid appointment", async () => {
    const testData = { "uid": "5672nnfdkd" };
    const expected = { success: true, data: "event has been cancelled" };
    const response = await request.delete("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expected);
});

test("Cannot make appointment with date that exists already", async () => {
    const testData = { "dtstart": "20240506T161212", "method": "REQUEST", "attendee": "shouldnotwork@gmail.com" };
    const expected = { "success": false, "error": "Date is already taken." };
    const response = await request.post("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expected);
});

test("Not enough info for making appointment", async () => {
    const testData = { "method": "REQUEST", "attendee": "shouldnotwork@gmail.com" };
    const expected = { "success": false, "error": "Not enough data to make appointment." };
    const response = await request.post("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expected);
});

test("Wrong info to look up appointment", async () => {
    const testData = { "attendee": "test@gmail.com" };
    const expected = { "success": false, "error": "Right information was not given." };
    const response = await request.get("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expected);
});

test("Wrong info to delete appointment", async () => {
    const testData = { "method": "REQUEST" };
    const expected = { "success": false, "error": "no uid given" };
    const response = await request.delete("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(expected);
});

test("Non-supported method is gracefully handled", async () => {
    const testData = { "method": "REQUEST" };
    const expected = { "success": false, "error": "Unsupported Method-Type" };
    const response = await request.patch("/")
        .send(testData)
        .set("Content-Type", "application/json");
    expect(response.statusCode).toBe(405);
    expect(response.body).toEqual(expected);
});