/**
 * PICS - Document upload receiver (Google Apps Script)
 * For every submission it: checks the data, saves the files to a new Drive
 * folder, and adds one row to the Google Sheet.
 *
 * Install: open your Google Sheet -> Extensions -> Apps Script -> paste this file.
 */

// ===== SETTINGS: edit these =====
var FOLDER_ID    = 'PASTE_DRIVE_FOLDER_ID_HERE'; // the main "PICS Uploads" Drive folder
var SHEET_ID     = '';                            // leave '' if you made this script from inside the Sheet (Extensions -> Apps Script)
var SHEET_NAME   = 'Uploads';                     // tab name inside the Sheet (created if missing), e.g. 'data'
var NOTIFY_EMAIL = '';                            // optional, e.g. 'picscochin@gmail.com'. '' = no email

// ===== LIMITS (same as the website form) =====
var MAX_FILES       = 3;
var MAX_FILE_BYTES  = 5 * 1024 * 1024;   // 5 MB each
var MAX_TOTAL_BYTES = 15 * 1024 * 1024;  // 15 MB all files
var MAX_PER_HOUR    = 5;                 // uploads allowed per email per hour

var HEADERS = ['Reference ID', 'Timestamp', 'Name', 'EmailID', 'PhoneNo',
               'No. of files', 'File names', 'Drive folder link'];

/** Opening the web-app link in a browser just shows that it is alive. */
function doGet() {
  return json_({ ok: true, service: 'PICS upload receiver' });
}

/** The website form sends its data here. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);

    // A bot filled the hidden field: pretend it worked, save nothing.
    if (data && data.website) return json_({ ok: true, ref: '' });

    var clean = validate_(data);
    checkRate_(clean.email);

    lock.waitLock(30000);                       // one upload at a time -> no duplicate IDs
    var ref = nextRef_();
    var folder = DriveApp.getFolderById(FOLDER_ID)
                         .createFolder(ref + ' – ' + clean.folderName);
    var saved = [];
    try {
      clean.files.forEach(function (f) {
        var name = uniqueName_(f.name, saved);
        folder.createFile(Utilities.newBlob(f.bytes, f.mime, name));
        saved.push(name);
      });
    } catch (err) {
      folder.setTrashed(true);                  // do not leave half-saved folders
      throw err;
    }

    addRow_(ref, clean, saved, folder.getUrl());
    lock.releaseLock();
    notify_(ref, clean, saved, folder.getUrl());
    return json_({ ok: true, ref: ref });

  } catch (err) {
    console.error(err);
    var msg = String(err && err.message || '');
    return json_({
      ok: false,
      error: msg.indexOf('USER:') === 0 ? msg.slice(5) : 'Something went wrong. Please try again.'
    });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------------- checks ---------------- */
function fail_(msg) { throw new Error('USER:' + msg); }

function validate_(d) {
  if (!d || typeof d !== 'object') fail_('Invalid request.');

  var name  = String(d.name  || '').replace(/\s+/g, ' ').trim();
  var email = String(d.email || '').trim();
  var phone = String(d.phone || '').trim();

  if (name.length < 2 || name.length > 80 || !/^[\p{L}][\p{L}\p{M} .'\-]*$/u.test(name)) fail_('Please check your name.');
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))               fail_('Please check your email.');
  if (!/^[0-9]{10}$/.test(phone))                                                       fail_('Phone number must be 10 digits.');

  var files = d.files;
  if (!Array.isArray(files) || files.length < 1) fail_('Please add at least one file.');
  if (files.length > MAX_FILES)                  fail_('Only ' + MAX_FILES + ' files are allowed.');

  var total = 0;
  var out = files.map(function (f) {
    var ext = (/\.([a-z0-9]+)$/i.exec(String(f && f.name || '')) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    if (ext !== 'pdf' && ext !== 'zip') fail_('Only PDF and ZIP files are allowed.');

    var bytes;
    try { bytes = Utilities.base64Decode(String(f.data || '')); }
    catch (x) { fail_('A file could not be read.'); }

    if (!bytes.length)               fail_('A file is empty.');
    if (bytes.length > MAX_FILE_BYTES) fail_('Each file must be 5 MB or less.');
    total += bytes.length;

    var b = [bytes[0] & 255, bytes[1] & 255, bytes[2] & 255, bytes[3] & 255];
    var okPdf = ext === 'pdf' && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;   // %PDF
    var okZip = ext === 'zip' && b[0] === 0x50 && b[1] === 0x4B && (b[2] === 3 || b[2] === 5);       // PK
    if (!okPdf && !okZip) fail_('A file is not a real PDF or ZIP.');

    var base = String(f.name).replace(/\.[^.]+$/, '').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || 'document';
    return { name: base + '.' + ext, bytes: bytes, mime: ext === 'pdf' ? 'application/pdf' : 'application/zip' };
  });
  if (total > MAX_TOTAL_BYTES) fail_('Total size must be 15 MB or less.');

  return {
    name: name, email: email, phone: phone, files: out,
    folderName: name.replace(/[\\\/:*?"<>|]/g, '').slice(0, 40).trim()
  };
}

function checkRate_(email) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + Utilities.base64EncodeWebSafe(email.toLowerCase());
  var n = Number(cache.get(key) || 0);
  if (n >= MAX_PER_HOUR) fail_('Too many uploads from this email. Please try again in an hour.');
  cache.put(key, String(n + 1), 3600);
}

/* ---------------- helpers ---------------- */
/** PICS-2026-0001, PICS-2026-0002 ... (counter kept safely in script settings) */
function nextRef_() {
  var props = PropertiesService.getScriptProperties();
  var year = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy');
  var key = 'COUNTER_' + year;
  var n = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(n));
  var num = String(n);
  while (num.length < 4) num = '0' + num;
  return 'PICS-' + year + '-' + num;
}

/** degree.pdf, degree (2).pdf, ... */
function uniqueName_(name, taken) {
  if (taken.indexOf(name) === -1) return name;
  var dot = name.lastIndexOf('.');
  var base = name.slice(0, dot), ext = name.slice(dot);
  var i = 2;
  while (taken.indexOf(base + ' (' + i + ')' + ext) !== -1) i++;
  return base + ' (' + i + ')' + ext;
}

function getSheet_() {
  // Sheet found by ID if given, otherwise the Sheet this script is attached to
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Sheet not found. Set SHEET_ID, or create this script from inside the Sheet.');
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function addRow_(ref, c, savedNames, folderUrl) {
  var sheet = getSheet_();
  var row = sheet.getLastRow() + 1;
  var stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm');

  // Text format keeps phone numbers exact and stops anything typed being read as a formula
  sheet.getRange(row, 1, 1, 7).setNumberFormats([['@', '@', '@', '@', '@', '0', '@']]);
  sheet.getRange(row, 1, 1, 7).setValues([[ref, stamp, c.name, c.email, c.phone, savedNames.length, savedNames.join(', ')]]);
  sheet.getRange(row, 8).setFormula('=HYPERLINK("' + folderUrl + '","Open folder")');
}

function notify_(ref, c, savedNames, folderUrl) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New document upload ' + ref + ' - ' + c.name,
      body: 'Reference: ' + ref + '\nName: ' + c.name + '\nEmail: ' + c.email + '\nPhone: ' + c.phone +
            '\nFiles: ' + savedNames.join(', ') + '\nFolder: ' + folderUrl
    });
  } catch (err) { console.error(err); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor (Run button) to give permissions and check your settings. */
function setupCheck() {
  Logger.log('Folder: ' + DriveApp.getFolderById(FOLDER_ID).getName());
  Logger.log('Sheet tab: ' + getSheet_().getName());
}
