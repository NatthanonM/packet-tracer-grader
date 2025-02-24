const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const session = require("express-session");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(morgan("dev")); // Logger middleware
app.use(express.static(path.join(__dirname, "public")));

// Session Middleware
app.use(session({
    secret: 'secret12345', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 2*3600000 // Session expires in 2 hours (3600000 milliseconds = 1 hour)
      }
  }));

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    console.log("Uploading file:", file.originalname);
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Password authentication middleware (for file list page)
function authenticate(req, res, next) {
    if (!req.session.isAuthenticated) {
      return res.status(403).json({ error: "Forbidden: You need to log in first. go to /admin" });
    }
    next();
  }

// Home Route to Serve Web Page
app.get("/home", (req, res) => {
  console.log("Serving home page");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// Admin Route 
app.get("/admin", (req, res) => {
    console.log("Serving admin page");
    res.sendFile(path.join(__dirname, "public", "login.html"));
  });

// Admin File List Page
app.get("/admin/files", authenticate ,(req, res) => {
  res.sendFile(path.join(__dirname, "public", "files.html"));
});


// Login Route (check password)
app.post("/api/login", (req, res) => {
    const { password } = req.body;
    const correctPassword = "1234"; // Replace with your password
  
    if (password === correctPassword) {
      req.session.isAuthenticated = true; // Store session info
      res.json({ message: "Login successful" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

// File Upload Endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }
  
    const submitterID = req.body.submitterID;
    const fileNameWithoutExtension = path.basename(req.file.originalname, path.extname(req.file.originalname));

    if (!submitterID || submitterID.trim() === "") {
      console.error("Submitter ID is required");
      return res.status(400).json({ error: "Submitter ID cannot be empty" });
    }
  
    if (submitterID !== fileNameWithoutExtension) {        
      console.error("File name and submitter ID do not match");
      return res.status(400).json({ error: "File name and submitter ID must be the same" });
    }
  
    console.log("File uploaded successfully:", req.file.filename);
    console.log("Submitter ID:", submitterID);

    // Store the upload timestamp along with the file information
    const fileData = {
        submitterID: submitterID,
        filename: req.file.filename,
        timestamp: new Date().toLocaleString(),
    };

    // Save the fileData to a simple in-memory store or a database
    // For simplicity, we store it in an array here (in a production system, a database should be used)
    if (!global.fileUploads) {
        global.fileUploads = [];
    }
    global.fileUploads.push(fileData);
  
    // Respond with file information and submitter ID
    res.json({
      filename: req.file.filename,
      submitterID: submitterID,
      message: "File uploaded successfully"
    });
  });

// Endpoint to get the list of all uploaded files with timestamps (Password Protected)
app.get("/api/files", authenticate, (req, res) => {
    if (!global.fileUploads || global.fileUploads.length === 0) {
      return res.json({ files: [] });
    }
    
    res.json({ files: global.fileUploads });
  });

// Sample API Route
// app.use("/api", require("./routes/apiRoutes"));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
