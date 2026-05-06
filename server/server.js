const express = require("express");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcrypt");
const mariadb = require("mariadb");
const { type } = require("os");
require("dotenv").config();



const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

//YES I KNOW WE SHOULD PROBABLY IMPORT THESE THINGS FROM OTHER JS FILES. WE CAN DO THIS LATER WHEN EVERYTHING WORKS. 



// Load users from JSON file
const loadUsers = () => {
  const data = fs.readFileSync("./users.json", "utf-8");
  return JSON.parse(data).users;
};

app.use("/LogInPage", async (req, res) => {
  const { email, password } = req.body;

  // Validate that email and password are provided
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const users = loadUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare provided password with stored hash
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Credentials are valid - return token
    res.json({
      token: `token_${user.id}_${Date.now()}`
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


//ROUTES WE WILL PROBABLY NEED
//Take data from frontend of a reported fault, and check it is correct and pass to database
//Take data from database of reported faults and pass it to the frontend when it asks. 

app.post("/api/reportfault", async (req,res) => {
  //take input in form of json, one entry for part with fault, one entry for type of fault and one for description of fault.
  //we need to first check that we have content for part with fault and type of fault and that we can match it to ids in the db.
  //once confirmed, we need to then prepare for entry to data base and generate other info needed. 
  //(unique id, component id, fault type id, fault status id, additional notes, datetime of record)

  try {
    const { faultyPart, typeOfFault, description } = req.body;

    if (!faultyPart || !typeOfFault ) {
      return res.status(400).json({error: "Missing required fields"})
    }
  } catch {
    console.error(err);
    res.status(500).json({error: "Internal server error"});
  }


});

app.post("/api/recievefaults", async (req,res) => {
  //we go to db, collect info about each fault (fault id, component, fault type, status, additional notes)
  //package this into a json response that can replace/overwrite data/faults.json
})

app.post("/api/scantoolin", async (req, res) => {
  //creates new entry in the tool tracking table, unless one exists already then return saying "it already has been marked in"
})

app.post("/api/scantoolout", async (req, res) => {
  //removes entry from tool tracking table, unless there isnt a record of it then return "no entry"
})

app.post("/api/fetchstepbystep", async (req, res) => {
  //goes and fetches step by step instructions that can be displayed for the fault selected.
})

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "server",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  // Keep startup log simple for local development.
  console.log(`Server running on http://localhost:${PORT}`);
});
