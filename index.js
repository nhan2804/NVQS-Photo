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
    const dir = path.join(__dirname, "public", folder);

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

    const fileName = `${selected.id}.${selected.fullName}.png`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// HANDLE UPLOAD
app.post("/upload", upload.single("image"), (req, res) => {
  return res.json({
    message: "Upload thành công!",
    filePath: `/public/${req.body.folder}/${req.file.filename}`,
  });
});

// START SERVER
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
