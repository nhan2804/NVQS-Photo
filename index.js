const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");

// Sample dropdown data
let people = require("./data.json");
people = people.map((p, index) => ({ id: p.stt, ...p }));

// RENDER UI
app.get("/", (req, res) => {
  const folder = req.query.folder || "";
  res.render("index", { people, folder });
});

// MULTER CONFIG (Dynamic folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder || "default"; // fallback nếu không có
    const dir = path.join(__dirname, "public", "uploaded", folder);

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: function (req, file, cb) {
    const { person } = req.body;
    console.log("Person ID:", person);

    const selected = people.find((p) => p.id.toString() === person.toString());

    if (!selected) return cb(new Error("Invalid person"));

    // Calculate index based on existing images
    let index = 1;
    if (selected.images && selected.images.length > 0) {
      index = selected.images.length + 1;
    }

    const fileName = `${selected.id}.${selected.fullName}.${index}.png`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// HANDLE UPLOAD
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const personId = req.body.person;
  const folder = req.body.folder || "default";
  const isPrimary = req.body.isPrimary === "on" || req.body.isPrimary === "true";
  const filePath = `/public/uploaded/${folder}/${req.file.filename}`;

  // 1. Update data.json file
  const dataPath = path.join(__dirname, "data.json");
  let rawData = fs.readFileSync(dataPath, "utf8");
  let jsonData = JSON.parse(rawData);

  const personIndex = jsonData.findIndex((p) => p.stt.toString() === personId.toString());

  if (personIndex !== -1) {
    if (!jsonData[personIndex].images) {
      jsonData[personIndex].images = [];
    }

    // If new image is primary, unset primary for others
    if (isPrimary) {
      jsonData[personIndex].images.forEach(img => img.isPrimary = false);
    }

    // Store object with path, folder, and isPrimary
    jsonData[personIndex].images.push({
      path: filePath.replace("/public", ""),
      folder: folder,
      isPrimary: isPrimary
    });

    fs.writeFileSync(dataPath, JSON.stringify(jsonData, null, 2), "utf8");

    // 2. Update in-memory 'people' variable
    const memoryPerson = people.find((p) => p.id.toString() === personId.toString());
    if (memoryPerson) {
      if (!memoryPerson.images) {
        memoryPerson.images = [];
      }
      
      if (isPrimary) {
        memoryPerson.images.forEach(img => img.isPrimary = false);
      }

      memoryPerson.images.push({
        path: filePath.replace("/public", ""),
        folder: folder,
        isPrimary: isPrimary
      });
    }
  }

  return res.json({
    message: "Upload thành công!",
    filePath: filePath,
  });
});

// VIEW UPLOADED IMAGES
app.get("/uploaded", (req, res) => {
  res.render("uploaded", { people });
});

// START SERVER
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
