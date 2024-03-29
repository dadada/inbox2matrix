import Imap = require('node-imap');
import config = require('config');

//global.Olm = require('olm');
import matrix = require('matrix-js-sdk');

let accounts = config.get('accounts');

import Storage = require('dom-storage');

let myUserId = accounts.matrix.user_id;
let myRoom = accounts.matrix.room;

var localStorage = new Storage('./db.json', { strict: false, ws: '  ' });
const webStorageSessionStore = new matrix.WebStorageSessionStore(localStorage);

let client = matrix.createClient({
  baseUrl: accounts.matrix.well_known.homeserver.base_url,
  accessToken: accounts.matrix.access_token,
  userId: myUserId,
  sessionStore: webStorageSessionStore,
  deviceId: accounts.matrix.device_id
});

var imap = new Imap(accounts.imap);
 
function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    console.log('IMAP inbox is ready');
  });
});

function fetchAndReport(results) {
  let fetched = imap.fetch(results, {
    bodies: ['HEADER.FIELDS (FROM)', 'HEADER.FIELDS (SUBJECT)'],
    markSeen: true
  });

  fetched.on('message', (msg, seqno) => {
    let buffer = '';

    msg.on('body', (stream, info) => {
      stream.on('data', (chunk) => {
        buffer += chunk.toString('utf-8').replace(/(\r\n\r\n|\n|\r\n|\r)/g, "\n");
      });
      stream.once('end', () => {
        console.log('Body: %s', buffer);
      });
    });

    msg.once('end', () => {
      let content = {
        'body': buffer,
        'msgtype': 'm.text'
      };

      client.sendEvent(myRoom, "m.room.message", content, "", (err, res) => {
        if (err) console.log(err.message);
      });
    });
  });

  fetched.once('error', (err) => {
    if (err) console.log(err.message);
  });

  fetched.once('end', function() {
    console.log('Done fetching all messages!');
  });
}

function processUnseen() {
  imap.search(['UNSEEN'], (err, results) => {
    if (err) console.log(err.message);
    else {
      try {
        fetchAndReport(results);
      } catch (e) {
        console.log(e.message);
      }
    }
  });
}

imap.once('mail', (numNewMsgs : number) => {
  console.log(`Inbox has ${numNewMsgs} mails`);
  processUnseen();
});

imap.once('update', (seqno: number) => {
  console.log('Some flags changed externally');
  processUnseen();
});

imap.once('error', function(err) {
  console.log(err);
  imap.end();
});
 
imap.once('end', function() {
  console.log('IMAP connection ended');
});

client.once('sync', function(state, prevState, res) {
    if (state === 'PREPARED') {
        console.log("IMAP " + state);
    }
});


async function startBot() {
  try {
    await imap.connect();
    await client.initCrypto();
    await client.startClient({initialSyncLimit: 200});
  } catch (err) {
    console.log(err.message)
  }
}

startBot();
setInterval(processUnseen, config.get("refresh_interval") * 1000);
