var Matcher = require('../lib/jsgrep.js').Matcher;
var Narcissus = require('../narcissus');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

describe('Matcher.getPatchedCode', function() {
  const fileName = path.resolve(path.join(__dirname, '../tests/jquery.js'));
  var source = fs.readFileSync(fileName);

  var tests = [
    {
      name: 'simple replacement',
      source: '1',
      patch: [
        "-1",
        "+2"
      ].join('\n'),
      result: '2'

    }, {
      name: 'two replacements',
      source: '1, 1',
      patch: [
        "-1",
        "+2"
      ].join('\n'),
      result: '2, 2'

    }, {
      name: 'remove var',
      source: 'var a = b;',
      patch: [
        "-var a = b;"
      ].join('\n'),
      result: ''

    }, {
      name: 'match token type',
      source: '({ "key": value })',
      patch: [
        "-key",
        "+newKey"
      ].join('\n'),
      result: '({ "key": value })'

    }, {
      name: 'token offsets',
      source: 'call(args)',
      patch: [
        '-call(A)'
      ].join('\n'),
      result: ''

    }
  ];

  function runTest(test) {
    it (test.name, function() {
      var sourceAst = Narcissus.parser.parse(test.source, 'test source');
      var matcher = new Matcher(sourceAst);
      var pattern = Matcher.getPatternFromPatch(test.patch, 'test patch');

      matcher.find(pattern, function(v) {
        v.node.applyPatch(test.patch, 'test patch');
      });

      expect(matcher.ast.tokenizer.source).toBe(test.result);
    });
  }

  for (var i = 0; i < tests.length; i++) {
    runTest(tests[i]);
  }
});
