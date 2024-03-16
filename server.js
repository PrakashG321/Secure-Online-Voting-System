import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user:process.env.User_name,
  host:process.env.Host_name,
  database:process.env.DB_name,
  password:process.env.Password,
  port:process.env.Port,
});

db.connect();

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { error: null });
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/voting", (req, res) => {
  // console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("voting.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get("/addtional-info",(req,res)=>{
  res.render("additional_info.ejs");
})

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render("login.ejs", { error: "Invalid email or password" });
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/voting");
    });
  })(req, res, next);
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM voters WHERE email = $1", [
      email,
    ]);

      if (checkResult.rows.length > 0) {
        // User already exists, render the register page with an error message
        res.render("register.ejs", { error: "User already exists. Please login or use a different email." });
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result=await db.query(
            "INSERT INTO voters (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
           const voters=result.rows[0];
           req.login(voters,(err)=>{
            res.redirect("/addtional-info");
           })
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/save-additional-info", async (req, res) => {
  const { username, first_name, last_name, citizenship_no, phone_no, address } = req.body;

  try {
    // Insert additional information into the database
    await db.query("INSERT INTO users (username, first_name, last_name, citizenship_no, phone_no, address) VALUES ($1, $2, $3, $4, $5 ,$6)", [username, first_name, last_name, citizenship_no, phone_no, address]);

    // Redirect or send response upon successful insertion
    res.redirect("/login");
  } catch (err) {
    if (err.code === '23505') {
      // PostgreSQL unique constraint violation error
      if (err.constraint === 'users_citizenship_no_key') {
        return res.render('additional_info.ejs', { error: 'Citizenship number already exists' });
      }
      if (err.constraint === 'users_phone_no_key') {
        return res.render('additional_info.ejs', { error: 'Phone number already exists' });
      }
    } else {
      // Other database errors
      console.error("Error saving additional information:", err);
      const errorMessage = "Error saving additional information. Please try again later.";
      return res.render("additional_info.ejs", { error: errorMessage });
    }
  }
});


app.post("/vote", async (req, res) => {
  const candidate = req.body.candidate;

  try {
    // Check if the user has already voted
    const checkResult = await db.query("SELECT * FROM votes WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('voting.ejs', { error: 'You have already voted.', success: '' });
    }

    // Save the vote to the database
    await db.query("INSERT INTO votes (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('voting.ejs', { success: 'Thank you for voting!', error: '' });
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('voting.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});





passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM voters WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});