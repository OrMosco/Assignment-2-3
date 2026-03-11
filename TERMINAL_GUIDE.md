# מדריך הפעלה מהטרמינל — Serverless File Management Service

מדריך זה מלמד אותך כיצד לגשת לכל נקודות ה-API מהטרמינל בצורה עצמאית, שלב אחר שלב.

---

## 📋 תנאים מוקדמים

לפני שתתחיל, וודא ש-`curl` מותקן אצלך:

```bash
curl --version
```

אם לא מותקן:
- **Mac**: `brew install curl`
- **Ubuntu/Debian**: `sudo apt-get install curl`
- **Windows**: curl מובנה ב-PowerShell ו-Command Prompt מגרסת Windows 10

---

## 🌐 כתובת הבסיס (Base URL)

```
https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev
```

כל הפקודות הבאות פועלות מול ה-API החי שכבר פרוס ב-AWS.

---

## 📤 1. העלאת קובץ (Upload)

ההעלאה מתבצעת ב-**שני שלבים**:
1. בקשת כתובת העלאה זמנית (Presigned URL) מה-API
2. העלאת הקובץ בפועל לכתובת שקיבלת

### שלב א — בקשת Presigned URL

**תחביר:**
```bash
curl -X POST https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "שם_פרויקט", "fileType": "סיומת", "fileName": "שם_קובץ.סיומת"}'
```

**דוגמה מלאה** — העלאת קובץ טקסט לפרויקט בשם `MyProject`:
```bash
curl -X POST https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "MyProject", "fileType": "txt", "fileName": "hello.txt"}'
```

**תגובה לדוגמה:**
```json
{
  "message": "Presigned upload URL generated successfully",
  "uploadUrl": "https://spacial-file-repo-dev.s3.eu-west-1.amazonaws.com/projects/MyProject/txt/hello.txt?X-Amz-...",
  "fileId": "3a6e93c0-1234-5678-abcd-ef0123456789",
  "s3Key": "projects/MyProject/txt/hello.txt",
  "expiresIn": "15 minutes"
}
```

> **שמור את ה-`fileId` וה-`uploadUrl` מהתגובה** — תצטרך אותם בשלבים הבאים!

---

### שלב ב — העלאת הקובץ לכתובת שקיבלת

**אפשרות 1 — העלאת קובץ קיים מהמחשב שלך:**
```bash
curl -X PUT "הכנס-כאן-את-ה-uploadUrl" \
  -H "Content-Type: text/plain" \
  --data-binary @hello.txt
```

**אפשרות 2 — העלאת תוכן ישירות (בלי קובץ פיזי):**
```bash
curl -X PUT "הכנס-כאן-את-ה-uploadUrl" \
  -H "Content-Type: text/plain" \
  -d "זה תוכן הקובץ שלי"
```

**תגובה מוצלחת:** קוד HTTP `200` ללא תוכן (גוף ריק).

---

### דוגמה שלמה מקצה לקצה (Copy-Paste מהיר)

**צעד 1** — בקש presigned URL ושמור אותו במשתנה:
```bash
RESPONSE=$(curl -s -X POST https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "DemoProject", "fileType": "txt", "fileName": "demo.txt"}')

echo $RESPONSE
```

**צעד 2** — חלץ את ה-`uploadUrl` מהתגובה:
```bash
UPLOAD_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['uploadUrl'])")
FILE_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['fileId'])")

echo "Upload URL: $UPLOAD_URL"
echo "File ID: $FILE_ID"
```

**צעד 3** — העלה את הקובץ:
```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: text/plain" \
  -d "Hello from terminal!"
```

---

## 📥 2. הורדת קובץ (Download)

גם הורדה מתבצעת ב-**שני שלבים**:
1. בקשת כתובת הורדה זמנית (Presigned URL) מה-API
2. הורדת הקובץ מהכתובת שקיבלת

### שלב א — בקשת Presigned Download URL

**תחביר:**
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files/FILE_ID/download?projectName=שם_פרויקט"
```

**דוגמה** — הורדת קובץ עם File ID ספציפי מפרויקט `MyProject`:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files/3a6e93c0-1234-5678-abcd-ef0123456789/download?projectName=MyProject"
```

**תגובה לדוגמה:**
```json
{
  "message": "Presigned download URL generated successfully",
  "downloadUrl": "https://spacial-file-repo-dev.s3.eu-west-1.amazonaws.com/projects/MyProject/txt/hello.txt?X-Amz-...",
  "fileName": "hello.txt",
  "fileType": "txt",
  "expiresIn": "60 minutes"
}
```

---

### שלב ב — הורדת הקובץ בפועל

**אפשרות 1 — הצגת תוכן הקובץ על המסך:**
```bash
curl "הכנס-כאן-את-ה-downloadUrl"
```

**אפשרות 2 — שמירת הקובץ לדיסק:**
```bash
curl -o "שם_קובץ_מקומי.txt" "הכנס-כאן-את-ה-downloadUrl"
```

**אפשרות 3 — פתיחה בדפדפן:**
פשוט הדבק את ה-`downloadUrl` בשורת הכתובת של הדפדפן.

---

### דוגמה שלמה — הורדה ישירה בפקודה אחת

```bash
# 1. קבל את ה-downloadUrl
DOWNLOAD_URL=$(curl -s "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files/3a6e93c0-1234-5678-abcd-ef0123456789/download?projectName=MyProject" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['downloadUrl'])")

# 2. הורד את הקובץ ושמור אותו
curl -o downloaded_file.txt "$DOWNLOAD_URL"

# 3. הצג את תוכן הקובץ
cat downloaded_file.txt
```

---

## 🔍 3. שאילתות (Query)

### 3.1 — רשימת כל הקבצים בפרויקט

**תחביר:**
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/שם_פרויקט/files"
```

**דוגמה** — כל הקבצים בפרויקט `MyProject`:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/MyProject/files"
```

**תגובה לדוגמה:**
```json
{
  "projectName": "MyProject",
  "fileType": "all",
  "count": 2,
  "files": [
    {
      "fileId": "3a6e93c0-1234-5678-abcd-ef0123456789",
      "fileName": "hello.txt",
      "fileType": "txt",
      "status": "UPLOADED",
      "uploadDate": "2024-03-11T14:20:00.000Z",
      "s3Key": "projects/MyProject/txt/hello.txt"
    }
  ]
}
```

---

### 3.2 — סינון לפי סוג קובץ בתוך פרויקט

**תחביר:**
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/שם_פרויקט/files?fileType=סיומת"
```

**דוגמה** — רק קבצי PNG בפרויקט `MyProject`:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/MyProject/files?fileType=png"
```

**דוגמה** — רק קבצי PDF:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/MyProject/files?fileType=pdf"
```

---

### 3.3 — חיפוש לפי סוג קובץ בכל הפרויקטים (GSI)

**תחביר:**
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files?fileType=סיומת"
```

**דוגמה** — כל קבצי ה-TXT מכל הפרויקטים:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files?fileType=txt"
```

**דוגמה** — כל קבצי ה-PNG מכל הפרויקטים:
```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files?fileType=png"
```

**תגובה לדוגמה:**
```json
{
  "fileType": "txt",
  "count": 3,
  "files": [
    {
      "projectId": "MyProject",
      "fileId": "3a6e93c0-...",
      "fileName": "hello.txt",
      "fileType": "txt",
      "status": "UPLOADED",
      "uploadDate": "2024-03-11T14:20:00.000Z"
    }
  ]
}
```

---

## 🚀 4. הרצת סקריפט הבדיקות האוטומטי

הפרויקט כולל סקריפט בדיקות מלא שמבצע את כל הפעולות אוטומטית:

### דרישות מוקדמות
```bash
node --version   # ודא שגרסה 18+ מותקנת
```

### הרצה
```bash
# שכפל את הפרויקט (אם עוד לא עשית)
git clone https://github.com/OrMosco/Assignment-2-3.git
cd Assignment-2-3

# התקן תלויות
npm install

# הרץ את הבדיקות
node test.js
```

### פלט צפוי
```
╔═══════════════════════════════════════════════════════════╗
║   Serverless File Management Service — E2E Test Suite    ║
╚═══════════════════════════════════════════════════════════╝

  API:     https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev
  Project: TestProject-1710162012345

─────────────────────────────────────────────────────────────
  ✅ Test 1: POST /upload (presigned URL) — fileId: abc-123...
  ✅ Test 2: PUT file directly to S3 — HTTP 200
  ⏳ Waiting 5s for S3 sync trigger...
  ✅ Test 3: S3 sync trigger (PENDING → UPLOADED) — status: UPLOADED
  ✅ Test 4: GET /projects/{name}/files (list all) — count: 1
  ✅ Test 5: GET /projects/{name}/files?fileType=txt — count: 1
  ✅ Test 6: GET /files?fileType=txt (GSI query) — total: 5
  ✅ Test 7: GET /files/{id}/download (presigned URL) — fileName: test-document.txt
  ✅ Test 8: Download file & integrity check — 71 bytes, content matches: true

─────────────────────────────────────────────────────────────
  Results: 8 passed, 0 failed, 8 total
─────────────────────────────────────────────────────────────
  🎉 All tests passed!
```

---

## 📊 5. טבלת סיכום כל הפקודות

| פעולה | שיטה | נתיב | דוגמה |
|-------|------|------|-------|
| בקשת URL להעלאה | `POST` | `/upload` | `curl -X POST .../upload -H "Content-Type: application/json" -d '{"projectName":"X","fileType":"txt","fileName":"f.txt"}'` |
| העלאת קובץ ל-S3 | `PUT` | `<uploadUrl>` | `curl -X PUT "<uploadUrl>" -H "Content-Type: text/plain" --data-binary @file.txt` |
| כל קבצי פרויקט | `GET` | `/projects/{name}/files` | `curl ".../projects/MyProject/files"` |
| סינון לפי סוג | `GET` | `/projects/{name}/files?fileType=X` | `curl ".../projects/MyProject/files?fileType=pdf"` |
| חיפוש בכל הפרויקטים | `GET` | `/files?fileType=X` | `curl ".../files?fileType=png"` |
| בקשת URL להורדה | `GET` | `/files/{id}/download?projectName=X` | `curl ".../files/FILE_ID/download?projectName=MyProject"` |
| הורדת קובץ | `GET` | `<downloadUrl>` | `curl -o output.txt "<downloadUrl>"` |

---

## ⚠️ הערות חשובות

1. **ה-Presigned URL לא מכיל מרחב ריק** — אם יש רווחים בשם הקובץ, השתמש ב-`%20` במקום
2. **כתובת ה-Upload תקפה למשך 15 דקות** — יש להעלות את הקובץ תוך הזמן הזה
3. **כתובת ה-Download תקפה למשך 60 דקות** — אחרי כן תצטרך לבקש כתובת חדשה
4. **סטטוס `PENDING` → `UPLOADED`** — אחרי שהעלאה הסתיימה, ה-Lambda של הסנכרון עדכן את הסטטוס אוטומטית (לוקח עד 5 שניות)
5. **שמות פרויקטים** — הן case-sensitive, כלומר `MyProject` שונה מ-`myproject`

---

## 🛠️ פתרון בעיות נפוצות

### שגיאה: `curl: command not found`
התקן curl כמפורט בסעיף "תנאים מוקדמים" למעלה.

### שגיאה: HTTP `400 Bad Request`
- ודא שה-JSON תקין (כל המרכאות נכונות)
- ודא שהשדות `projectName`, `fileType`, ו-`fileName` כלולים בגוף הבקשה

### שגיאה: HTTP `404 Not Found`
- ודא שה-`fileId` ו-`projectName` נכונים
- ודא שהקובץ אכן הועלה (סטטוס `UPLOADED` ולא `PENDING`)

### שגיאה: HTTP `403 Forbidden` על ה-Presigned URL
- ה-URL פג תוקף — בקש URL חדש

### הקובץ לא מוצג ברשימה אחרי העלאה
- המתן 5 שניות ונסה שוב (ה-sync Lambda צריך זמן לרוץ)
