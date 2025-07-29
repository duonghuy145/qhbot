const { spawn } = require("child_process");
const logger = require("./utils/log"); // Đảm bảo logger của bạn vẫn hoạt động
const path = require('path');
const express = require("express");
const app = express();

///////////////////////////////////////////////////////////
//========= Khởi tạo server cho Music Player/Info =========//
///////////////////////////////////////////////////////////
const PORT = process.env.PORT || 3000;

// Định nghĩa route cho trang chủ để hiển thị Music Player
app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html')); // Gửi file index.html
});

// Khởi động server HTTP
app.listen(PORT, () => {
    console.log(`[ SECURITY ] -> Máy chủ khởi động tại port: ${PORT}`);
});

// Hàm khởi động bot chính (giữ nguyên logic quản lý tiến trình con)
function startBot(message) {
    if (message) {
        logger(message, "BOT_CORE");
    }

    if (global.botChildProcess) {
        logger(`Phát hiện tiến trình bot cũ (PID: ${global.botChildProcess.pid}). Đang dừng...`, "BOT_CONTROL");
        global.botChildProcess.kill('SIGKILL');
        global.botChildProcess = null;
    }

    logger("Đang khởi tạo tiến trình bot mới...", "BOT_CONTROL");
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "main.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    global.botChildProcess = child;
    logger(`Bot đã khởi động (PID: ${child.pid})! 🤖`, "BOT_CONTROL");

    child.on("close", async (codeExit) => {
        global.botChildProcess = null;
        logger(`Tiến trình bot đã đóng với mã: ${codeExit}`, "BOT_STATUS");

        if (codeExit === 1) {
            logger("Bot thoát với mã 1. Đang Khởi Động Lại, Vui Lòng Chờ ...", "BOT_RESTART");
            return startBot("Đang Khởi Động Lại, Vui Lòng Chờ ...");
        } else if (codeExit && String(codeExit).startsWith("2")) {
            const delay = parseInt(String(codeExit).substring(1)) * 1000;
            logger(`Bot yêu cầu trì hoãn ${delay / 1000}s trước khi khởi động lại.`, "BOT_DELAY");
            await new Promise(resolve => setTimeout(resolve, delay));
            logger("Bot đã được kích hoạt lại sau trì hoãn, vui lòng chờ! 🎉", "BOT_ACTIVATED");
            startBot("Bot đã được kích hoạt lại sau trì hoãn, vui lòng chờ!");
        } else {
            logger(`Bot dừng với mã ${codeExit}. Sẽ không tự động khởi động lại.`, "BOT_STOPPED");
        }
    });

    child.on("error", function(error) {
        logger("Có lỗi nghiêm trọng xảy ra trong tiến trình bot: " + JSON.stringify(error), "[ LỖI BOT ]");
    });
}

// Gọi hàm khởi động bot khi file được chạy lần đầu
startBot();