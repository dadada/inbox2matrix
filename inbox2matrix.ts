import Imap = require('imap');
import config = require('config');
import matrix = require("matrix-js-sdk");

let accounts = config.get('accounts');

let myUserId = accounts.matrix.user;
let myRoom = accounts.matrix.room;

let client = matrix.createClient({
  baseUrl: accounts.matrix.baseUrl,
  accessToken: accounts.matrix.accessToken,
  userId: myUserId
});

var imap = new Imap(accounts.imap);
 
function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

client.on("RoomMember.membership", function(event, member) {
  if (member.membership === "invite" && member.userId === myUserId) {
    client.joinRoom(member.roomId).done(function() {
      console.log("Auto-joined %s", member.roomId);
    });
  }
});

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    console.log('ready');
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
        console.log('Buffer: %s', buffer);
      });
    });

    msg.once('end', () => {
        let content = {
          'body': buffer,
          'msgtype': 'm.text'
        };

        client.sendEvent(myRoom, "m.room.message", content, "", (err, res) => {
          console.log(err);
        });
    });
  });

  fetched.once('error', (err) => {
    console.log(err);
  });

  fetched.once('end', function() {
    console.log('Done fetching all messages!');
    imap.end();
  });
}

function processUnseen() {
  imap.search(['UNSEEN'], (err, results) => {
    if (err) console.log(err);
    else {
      try {
        fetchAndReport(results);
      } catch (e) {
        console.log(e);
      }
    }
  });
}

imap.once('mail', (numNewMsgs : number) => {
  console.log(`You have ${numNewMsgs} mail`);
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
  console.log('Connection ended');
});
 
imap.connect();

client.startClient({initialSyncLimit: 200});

client.once('sync', function(state, prevState, res) {
    if(state === 'PREPARED') {
        console.log("prepared");
    } else {
        console.log(state);
    }
});

setInterval(processUnseen, 5 * 60 * 1000);
