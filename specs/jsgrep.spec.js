var Narcissus = require('../narcissus');
var _ = require('underscore');
var jsgrep = require('../lib/jsgrep.js');
var path = require('path');

describe('jsgrep', function() {
  const testSource =
    'var test = require("test").test;\n' +
    'if (test.isTesting()) {\n' +
    '  console.log("testing...");\n' +
    '}\n' +
    'var obj = { top: 1, left: 2 };';
  const testPattern = 'A.isTesting()';
  const testAnswer = 1;

  function runTest(options) {
    var resultCount = 0;
    function callback(node, variables) {
      resultCount++;
    }

    jsgrep.jsgrep(_.extend({
      callback: callback
    }, options));

    return resultCount;
  }

  it('with { source: String, pattern: String }', function() {
    expect(runTest({
      source: testSource,
      pattern: testPattern
    })).toBe(testAnswer);
  });

  it('with { source: AST, pattern: String }', function() {
    expect(runTest({
      source: Narcissus.parser.parse(testSource),
      pattern: testPattern
    })).toBe(testAnswer);
  });

  it('with { source: String, pattern: AST }', function() {
    expect(runTest({
      source: testSource,
      pattern: jsgrep.Matcher.compilePattern(testPattern)
    })).toBe(testAnswer);
  });

  it('with { source: String, patterns: [ String, AST ] }', function() {
    expect(runTest({
      source: testSource,
      patterns: [ testPattern, jsgrep.Matcher.compilePattern(testPattern) ]
    })).toBe(testAnswer * 2);
  });

  it('with { filename: String }', function() {
    expect(runTest({
      filename: path.resolve(path.join(__dirname, '../tests/jquery.js')),
      pattern: 'A === B'
    })).toBe(461);
  });

  it('with { strictMatches: true }', function() {
    expect(runTest({
      source: testSource,
      pattern: '({ top: A })',
      strictMatches: true
    })).toBe(0);
  });

  it('with { strictMatches: false }', function() {
    expect(runTest({
      source: testSource,
      pattern: '({ top: A })',
      strictMatches: false
    })).toBe(1);
  });

});
