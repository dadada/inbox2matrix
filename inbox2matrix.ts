import process = require('process');
import Imap = require('imap');
import { inspect } from 'util';
import config = require('config');

let account = config.get('account');
 
var imap = new Imap(account);
 
function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}
 
imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    console.log('ready');
  });
});

imap.once('mail', (numNewMsgs : number) => {
  console.log(`You have ${numNewMsgs} mail`);
});

imap.once('update', (seqno : number, info : object) => {
  console.log(info);
});
 
imap.once('error', function(err) {
  console.log(err);
  imap.end();
});
 
imap.once('end', function() {
  console.log('Connection ended');
});
 
imap.connect();
