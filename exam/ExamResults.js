function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetId = "1QOONY7i-mjyieCcSTE7WadTASG7ElkiSYhkIUAK6JX4";
    const spread = SpreadsheetApp.openById(sheetId);
    let sheet = spread.getSheetByName("ExamResults");
    
    if (!sheet) {
      sheet = spread.insertSheet("ExamResults");
      sheet.appendRow(["No", "Timestamp", "Username", "FullName", "Phone", "Score", "Total", "Percentage", "Result"]);
    }
    
    const timestamp = new Date();
    const score = data.score || 0;
    const total = data.total || 20;
    const percentage = ((score / total) * 100).toFixed(2);
    const isPass = (score === total);
    const resultText = isPass ? "PASS" : "FAIL";
    
    const lastRow = sheet.getLastRow();
    
    sheet.appendRow([lastRow, timestamp, data.username || "Unknown", data.fullname || "Unknown", data.phone || "Unknown", score, total, percentage + "%", resultText]);
    
    return ContentService.createTextOutput(JSON.stringify({status: "success", isPass: isPass})).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({status: "active"})).setMimeType(ContentService.MimeType.JSON);
}