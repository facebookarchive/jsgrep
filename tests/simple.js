var parse = require('narcissus/lib/parser').parse;

var a = 1, b = 2;
var c;

var obj = {
  one: 'yes',
  two: 'no',
  extend: a,
  ready: function() {
    var lol = /^[\+(\-]?\d+/;
  }
};

if (__DEV__) {
  console.log('development version!');
} else {
  console.log('production version!');
}

// -----

if (__DEV__) {
  obj['yes'] = 'very yes';
}

foo(1, 'no', 'way');

obj['yes'] = obj['yes'];

function hats(c) {
  var a = function() {
    return b;
  };

  return a();
}

a = (b = 2) || c + 1;
hats(b);

foo(0, 'haru', 'mamburu');

try {
  q = REFERENCEERROR;
} catch(e) {
  ' whatever';
} finally {
  delete a;
}
