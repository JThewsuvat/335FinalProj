/* 
 * CLAIRE NEACE
 * DI CHEN
 * JEFFREY THEWSUVAT
 */

const http = require('http');
const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

 /* Our database and collection */
 const databaseAndCollection = {db: "CMSC335DB", collection:"finalProjectData"};

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.gkzjb1l.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect();
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

/*** Command Line ***/
process.stdin.setEncoding("utf8");
const host = 5000;
app.listen(host);
console.log(`Web server started and running at http://localhost:${host}`);
process.stdout.write("Stop to shutdown the server: ");
process.stdin.on("readable", () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
        }
        process.stdout.write("Stop to shutdown the server: ");
        process.stdin.resume();
    }
});

/*** Express code ***/
app.use(express.static(__dirname + '/public'));


app.get("/", (request, response) => {
    response.render("home");
});

app.get("/form", (request, response) => {
    response.render("form")
})

app.post("/processForm", (request, response) => {
    const variables = {
        name: request.body.name,
        email: request.body.email,
        art: request.body.art,
    };

    let data = {name: request.body.name,
        email: request.body.email,
        art: request.body.art};

    processForm(data);
    response.render("formdata", variables);
})

app.get("/viewData", async function(request, response) {
    await client.connect();
    let size = await getSize(client, databaseAndCollection)
    const variables = {
        numOfEntries: size
    }
    response.render("getdata", variables);
})

app.post("/result", async function(request, response) {
    let target = await getData(request.body.name);

    const variables = {
        name: target?.name ?? "NONE",
        email: target?.email ?? "NONE",
        art: target?.art ?? "NONE",
    }
    response.render("formdata", variables);
})

app.get("/API", (request, response) => {
    response.render("api");
});

app.post("/processAPI", async function(request, response) {
    const axios = require('axios');

    const options = {
    method: 'GET',
    url: 'https://real-time-image-search.p.rapidapi.com/search',
    params: {
        query: "art by " + request.body.query,
        region: 'us'
    },
    headers: {
        'X-RapidAPI-Key': 'a0c4161d6bmsh608d0378e30c4f6p130e25jsnd570cb965019',
        'X-RapidAPI-Host': 'real-time-image-search.p.rapidapi.com'
    }
    };

    try {
        const res = await axios.request(options);
        const data = res.data.data;
        let map = new Map();
        for (entry of data) {
            map.set(entry.url, entry.source_url)
            if (Array.from(map.keys()).length === 3) {
                break;
            }
        }
        
        let html = "";
        for (url of Array.from(map.keys())) {
            html += `<img src=${url}><br>Source: <a href=${map.get(url)}>${map.get(url)}</a><br><br><br>`;
        }

        const variables = {
            name: request.body.query,
            table: html
        }

        response.render("processapi", variables);

    } catch (error) {
        console.error(error);
    }
});

/*** MongoDB code ***/
async function getSize(client, databaseAndCollection) {
    let filter = {};
    const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
    const result = await cursor.toArray();
    return result.length
}

async function insertData(client, databaseAndCollection, newData) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newData);
}

async function processForm(data) {
    try {
        await client.connect();
       
        /* Insert the data */
        await insertData(client, databaseAndCollection, data);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function getData(targetName) {
    try {
        await client.connect();
        let filter = {name: targetName};
        const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .findOne(filter);
        return result;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
