import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import path from "path";
import fs from "fs";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static receipts directory
const receiptsDir = path.join(process.cwd(), "public", "receipts");
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}
app.use("/receipts", express.static(receiptsDir));

app.use("/api", router);

export default app;
