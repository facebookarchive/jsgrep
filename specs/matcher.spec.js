var Narcissus = require('../narcissus');
var _ = require('underscore');
var jsgrep = require('../lib/jsgrep.js');
var path = require('path');
var fs = require('fs');

// These tests are pretty weak, they just run some random queries and check the
// count of the results in a known corpus.

describe('Matcher.find', function() {
  const fileName = path.resolve(path.join(__dirname, '../tests/jquery.js'));
  var source = fs.readFileSync(fileName);
  var sourceAst = Narcissus.parser.parse(source, fileName, 1);

  var tests = [
    { pattern: 'A = A || B;', count: 19 },
    { pattern: 'setTimeout(A, 0)', count: 2 },
    { pattern: '"image"', count: 1 },
    { pattern: '({ opacity: A })', count: 8 },
    { pattern: '({ opacity: A })', strict: true, count: 5 },
    { pattern: '[ ..., "height", ... ]', count: 5 },
    { pattern: '[ ..., false ]', count: 1 }
  ];

  var resultCount = 0;
  function callback(node, variables) {
    resultCount++;
  }
  beforeEach(function() {
    resultCount = 0;
  });

  function runTest(test) {
    it ('for ' + test.pattern + (test.strict ? ' (strict)' : ''), function() {

      var matcher = new jsgrep.Matcher(sourceAst, { callback: callback });
      if (test.strict) {
        expect(matcher.findStrict(test.pattern).length).toBe(test.count);
      } else {
        expect(matcher.find(test.pattern).length).toBe(test.count);
      }
    });
  }

  for (var i = 0; i < tests.length; i++) {
    runTest(tests[i]);
  }

  it ('with an additional filter', function() {
    var matcher = new jsgrep.Matcher(sourceAst, { callback: callback });
    var results = matcher.find(tests[0].pattern, function(v) {
      return false;
    });
    expect(results.length).toBe(0);
  });
  
  it ('for "with" keyword', function() {
    var matcher = new jsgrep.Matcher('with ({x: 10}) { console.log(x); }');
    var results = matcher.find('with (A) { ... }');
    expect(results.length).toBe(1);
  });
  
});

describe('Matcher offsets', function() {
  var tests = [
    {
      name: 'identifier',
      search: 'window.document',
      pattern: 'A.B',
      result: { A: 'window', B: 'document' }

    }
  ];

  function runTest(test) {
    it('for ' + test.name, function() {
      var matcher = new jsgrep.Matcher(test.search);
      var resultCount = 0;

      matcher.find(test.pattern, function(v) {
        resultCount++;

        for (var metavar in test.result) {
          if (test.result.hasOwnProperty(metavar)) {
            expect(v[metavar].value).toBe(test.result[metavar]);
          }
        }
      });

      expect(resultCount).toEqual(1);
    });
  }

  for (var i = 0; i < tests.length; i++) {
    runTest(tests[i]);
  }
});

