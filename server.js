import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);


app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage: storage });


function getFileType(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.pdf') {
    return 'pdf';
  } else if (['.png', '.jpg', '.jpeg'].includes(extension)) {
    return 'image';
  }
  return 'unknown';
}

let endDate = new Date('2024-03-27T12:00:00');

const db = new pg.Client({
  user: process.env.User_name,
  host: process.env.Host_name,
  database: process.env.DB_name,
  password: process.env.Password,
  port: process.env.Port,
});

db.connect();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/admin-login", (req, res) => {
  res.render("admin-login.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { error: null });
});

app.get("/register", (req, res) => {
  res.render("register-and-info.ejs");
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
  if (req.isAuthenticated()) {
    const endDateISOString = endDate.toISOString();
    res.render('voting.ejs', { endDate: endDateISOString });
  } else {
    res.redirect("/login");
  }
});

app.get("/voting-results", async (req, res) => {
  try {
    const votesData = await db.query("SELECT candidate, COUNT(*) as votes FROM votes GROUP BY candidate");
    const votesData_DeputyMayor = await db.query("SELECT candidate, COUNT(*) as votes FROM deputy_mayor_votes GROUP BY candidate");
    const votesData_WardPresident = await db.query("SELECT candidate, COUNT(*) as votes FROM ward_president GROUP BY candidate");
    const votesData_Female = await db.query("SELECT candidate, COUNT(*) as votes FROM female_member GROUP BY candidate");
    const votesData_DalitFemale = await db.query("SELECT candidate, COUNT(*) as votes FROM dalit_female_member GROUP BY candidate");
    const votesData_Member = await db.query("SELECT candidate, COUNT(*) as votes FROM member GROUP BY candidate");

    const votes = votesData.rows;
    const votes_DeputyMayor = votesData_DeputyMayor.rows;
    const votes_WardPresident = votesData_WardPresident.rows;
    const votes_Female = votesData_Female.rows;
    const votes_DalitFemale = votesData_DalitFemale.rows;
    const votes_Member = votesData_Member.rows;

    res.render("voting_results.ejs", { votes, votes_DeputyMayor, votes_WardPresident, votes_Female, votes_DalitFemale, votes_Member });
  } catch (err) {
    console.error("Error fetching voting results:", err);
    res.status(500).send("Error fetching voting results");
  }
});

app.get("/admin/dashboard", async (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.redirect("/admin-login");
  }

  try {
    const userResult = await db.query("SELECT id, first_name, last_name, email, phone_no, address, citizenship_no, citizenship_document FROM voters");
    const users = userResult.rows;

    const voteResult = await db.query("SELECT id, candidate, voter_id FROM votes");
    const votes = voteResult.rows;

    const votesData_DeputyMayor = await db.query('SELECT * FROM deputy_mayor_votes');
  const votes_DeputyMayor = votesData_DeputyMayor.rows;

  const votesData_WardPresident = await db.query('SELECT * FROM ward_president');
  const votes_WardPresident = votesData_WardPresident.rows;

  const votesData_Female = await db.query('SELECT * FROM female_member');
  const votes_Female = votesData_Female.rows;

  const votesData_DalitFemale = await db.query('SELECT * FROM dalit_female_member');
  const votes_DalitFemale = votesData_DalitFemale.rows;

  const votesData_Member = await db.query('SELECT * FROM member');
  const votes_Member = votesData_Member.rows;


    res.render("admin.ejs", { votes, users, votes_DeputyMayor,votes_WardPresident,votes_Female,votes_DalitFemale, votes_Member, endDate: endDate.toISOString(), getFileType });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
});

app.post('/admin-login', (req, res, next) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM admins WHERE username = $1', [username])
    .then(result => {
      if (result.rows.length === 0) {
        // User not found, render the admin-login.ejs with an error message
        return res.render('admin-login.ejs', { error: 'User not found' });
      }
      const admin = result.rows[0];
      bcrypt.compare(password, admin.password, (err, isMatch) => {
        if (err) {
          return next(err);
        }
        if (!isMatch) {
          // Passwords don't match, render the admin-login.ejs with an error message
          return res.render('admin-login.ejs', { error: 'Invalid username or password' });
        }
        req.session.isAdmin = true;
        return res.redirect('/admin/dashboard');
      });
    })
    .catch(err => {
      console.error(err);
      // Render the admin-login.ejs with a generic error message
      return res.render('admin-login.ejs', { error: 'An error occurred' });
    });
});

app.post("/admin/delete-user", async (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.render("error", { error: "Forbidden" });
  }

  const userId = req.body.userId;
  // Start a transaction
  await db.query("BEGIN");
  // Delete the voter
  await db.query("DELETE FROM voters WHERE id = $1", [userId]);
  // Commit the transaction
  await db.query("COMMIT");
  const usersData = await db.query('SELECT * FROM voters');
  const users = usersData.rows;

  const votesData = await db.query('SELECT * FROM votes');
  const votes = votesData.rows;

  const votesData_DeputyMayor = await db.query('SELECT * FROM deputy_mayor_votes');
  const votes_DeputyMayor = votesData_DeputyMayor.rows;

  const votesData_WardPresident = await db.query('SELECT * FROM ward_president');
  const votes_WardPresident = votesData_WardPresident.rows;

  const votesData_Female = await db.query('SELECT * FROM female_member');
  const votes_Female = votesData_Female.rows;

  const votesData_DalitFemale = await db.query('SELECT * FROM dalit_female_member');
  const votes_DalitFemale = votesData_DalitFemale.rows;

  const votesData_Member = await db.query('SELECT * FROM member');
  const votes_Member = votesData_Member.rows;

  try {
    res.render('admin.ejs', { users, votes,votes_DeputyMayor,votes_WardPresident,votes_Female,votes_DalitFemale, votes_Member, endDate: endDate.toISOString(), message: "User and associated votes deleted successfully", getFileType });
  } catch (err) {
    // Rollback the transaction in case of an error
    await db.query("ROLLBACK");
    console.error("Error deleting user:", err);
    res.render('admin.ejs', { users, votes,votes_DeputyMayor,votes_WardPresident,votes_Female,votes_DalitFemale, votes_Member, endDate: endDate.toISOString(), error: "Error deleting user", getFileType });
  }
});

app.post("/admin/update-end-date", async (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).send("Forbidden");
  }
  const newEndDate = req.body.newEndDate;
  await db.query("BEGIN");
  // Commit the transaction
  await db.query("COMMIT");
  const usersData = await db.query('SELECT * FROM voters');
  const users = usersData.rows;

  const votesData = await db.query('SELECT * FROM votes');
  const votes = votesData.rows;

  const votesData_DeputyMayor = await db.query('SELECT * FROM deputy_mayor_votes');
  const votes_DeputyMayor = votesData_DeputyMayor.rows;

  const votesData_WardPresident = await db.query('SELECT * FROM ward_president');
  const votes_WardPresident = votesData_WardPresident.rows;

  const votesData_Female = await db.query('SELECT * FROM female_member');
  const votes_Female = votesData_Female.rows;

  const votesData_DalitFemale = await db.query('SELECT * FROM dalit_female_member');
  const votes_DalitFemale = votesData_DalitFemale.rows;

  const votesData_Member = await db.query('SELECT * FROM member');
  const votes_Member = votesData_Member.rows;

  try {
    endDate = new Date(newEndDate);
    res.render('admin.ejs', { users, votes,votes_DeputyMayor,votes_WardPresident,votes_Female,votes_DalitFemale, votes_Member, endDate: endDate.toISOString(), message: "End date updated successfully", getFileType });
  } catch (err) {
    console.error("Error updating end date:", err);
    res.render('admin.ejs', { users, votes,votes_DeputyMayor,votes_WardPresident,votes_Female,votes_DalitFemale, votes_Member, endDate: endDate.toISOString(), error: "Error updating end date", getFileType });
  }
});

app.post("/register-and-info", upload.single('citizenship_document'), async (req, res) => {
  const { username, password, first_name, last_name, citizenship_no, phone_no, address } = req.body;
  const citizenshipDocument = req.file;

  try {
    const checkResult = await db.query("SELECT * FROM voters WHERE email = $1", [username]);
    if (checkResult.rows.length > 0) {
      return res.render("register-and-info.ejs", { error: "User already exists. Please login or use a different email." });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await db.query(
      "INSERT INTO voters (email, password, first_name, last_name, citizenship_no, phone_no, address, citizenship_document) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [username, hashedPassword, first_name, last_name, citizenship_no, phone_no, address, citizenshipDocument.filename]
    );

    res.redirect("/login");
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'voters_citizenship_no_key') {
        return res.render('register-and-info.ejs', { error: 'Citizenship number already exists' });
      }
      if (err.constraint === 'voters_phone_no_key') {
        return res.render('register-and-info.ejs', { error: 'Phone number already exists' });
      }
    } else {
      console.error("Error saving registration and additional information:", err);
      const errorMessage = "Error saving registration and additional information. Please try again later.";
      return res.render("register-and-info.ejs", { error: errorMessage });
    }
  }
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Change: Render the login.ejs template with the error message
      return res.render("login.ejs", { error: info.message });
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect("/voting");
    });
  })(req, res, next);
});

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM voters WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              // Change: Pass an error message when password is invalid
              return cb(null, false, { message: "Invalid email or password" });
            }
          }
        });
      } else {
        // Change: Pass an error message when user is not found
        return cb(null, false, { message: "User not found" });
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

function isVotingAllowed() {
  const currentTime = new Date();
  return currentTime <= endDate;
}

app.post("/vote", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    if (!isVotingAllowed()) {
      return res.render('voting.ejs', { error: 'Voting has ended. You cannot cast your vote anymore.', success: '' });
    }
    const checkResult = await db.query("SELECT * FROM votes WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('voting.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO votes (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('deputy_mayor_voting.ejs'); // Render the deputy mayor voting page after successful vote
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('voting.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});

app.post("/deputy-mayor-vote", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    const checkResult = await db.query("SELECT * FROM deputy_mayor_votes WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('deputy_mayor_voting.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO deputy_mayor_votes (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('ward_president.ejs');
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('deputy_mayor_voting.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});
app.post("/ward-president-vote", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    const checkResult = await db.query("SELECT * FROM ward_president WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('ward_president.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO ward_president (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('female_member.ejs');
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('ward_president.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});

app.post("/female-member", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    const checkResult = await db.query("SELECT * FROM female_member WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('female_member.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO female_member (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('dalit_female_member.ejs');
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('female_member.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});

app.post("/dalit_female", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    const checkResult = await db.query("SELECT * FROM dalit_female_member WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('female_member.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO dalit_female_member (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('member.ejs');
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('member.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});

app.post("/member-vote", async (req, res) => {
  const candidate = req.body.candidate;
  try {
    const checkResult = await db.query("SELECT * FROM member WHERE voter_id = $1", [req.user.id]);
    if (checkResult.rows.length > 0) {
      return res.render('member.ejs', { error: 'You have already voted.', success: '' });
    }
    await db.query("INSERT INTO member (candidate, voter_id) VALUES ($1, $2)", [candidate, req.user.id]);
    console.log(`Vote cast for ${candidate} by user ${req.user.id}`);
    res.render('member.ejs', { success: 'Thank you for voting!', error: '' });
  } catch (err) {
    console.error("Error casting vote:", err);
    res.render('member.ejs', { error: 'Error casting vote. Please try again later.', success: '' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});