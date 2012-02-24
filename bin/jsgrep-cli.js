#!/usr/bin/env node

// Copyright 2011 Facebook, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.var fs = require('fs');

var Narcissus = require('../narcissus');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var jsgrep = require('../lib/jsgrep.js');

/// Used to print the matching snippet rather than the first line of it.
const PRINT_FIRST_LINE = 'first-line';
const PRINT_ONLY_MATCHING = 'only-matching';
const PRINT_METAVAR = 'metavar';
const PRINT_FILES_NOT_MATCHING = 'files-not-matching';
const PRINT_FILES_MATCHING = 'files-matching';

var config = {
  paths: [ ],
  recursive: false,
  patterns: [ ],
  matchScript: false,
  strictMatches: false,
  print: PRINT_FIRST_LINE,
  printMetavar: null,
  lineNumber: false,
  filename: null,
  dumpAst: false,
};

function usage(hasError) {
  if (hasError) {
    console.log("See jsgrep --help for usage information.");
    process.exit(hasError ? 1 : 0);
  }
  console.log("jsgrep: Syntactically aware grep for JavaScript");
  console.log("");
  console.log("Usage: jsgrep [OPTIONS] PATTERN FILES...");
  console.log("");
  console.log("Search specifiers:");
  console.log("  -e, --pattern=PATTERN     Pattern to search for. Multiples allowed.");
  console.log("  -f, --match-script=FILE   Path to match script.");
  console.log("  -S, --strict-matches      Require exact matches for object initializers, etc.");
  console.log("");
  console.log("Output control:");
  console.log("  -o, --only-matching       Print only the expression that matched.");
  console.log("  -p, --print=VAR           Print only the named matching metavariable.");
  console.log("  -n, --line-number         Print the line number with output lines.");
  console.log("  -H, --with-filename       Print the filename for each match.");
  console.log("  -h, --no-filename         Do not print the filename for each match.");
  console.log("  -L, --files-without-match Only print file names with no matches.");
  console.log("  -l, --files-with-matches  Only print file names with matches.");
  console.log("");
  console.log("Miscellaneous:");
  console.log("  -r, --recursive           Scan directories for JavaScript files.");
  console.log("  -V, --version             Show version information.");
  console.log("      --dump-ast            Dump the AST for the patterns and exit.");
  process.exit(0);
}

function version() {
  var package = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));
  console.log("jsgrep " + package.version);
  process.exit(0);
}

(function parseArgs() {
  var getopt = require('posix-getopt');
  var parser = new getopt.BasicParser(
    'e:(pattern)f:(match-script)S(strict-matches)o(only-matching)p:(print)' +
    'n(line-number)H(with-filename)h(no-filename)L(files-without-match)' +
    'l(files-with-matches)r(recursive)V(version)D(dump-ast)_(help)',
    process.argv);

  while ((option = parser.getopt()) !== undefined) {
    switch(option.option) {
      case 'e':
        config.patterns.push(option.optarg);
        break;
      case 'f':
        config.matchScript = option.optarg;
        break;
      case 'S':
        config.strictMatches = true;
        break;
      case 'o':
        config.print = PRINT_ONLY_MATCHING;
        break;
      case 'p':
        config.print = PRINT_METAVAR;
        config.printMetavar = option.optarg;
        break;
      case 'n':
        config.lineNumber = true;
        break;
      case 'H':
        config.filename = true;
        break;
      case 'h':
        config.filename = false;
        break;
      case 'L':
        config.print = PRINT_FILES_NOT_MATCHING;
        break;
      case 'l':
        config.print = PRINT_FILES_MATCHING;
        break;
      case 'r':
        config.recursive = true;
        config.filename = true;
        break;
      case 'V':
        version();
        break;
      case 'D':
        config.dumpAst = true;
        break;
      case '?':
      case '_':
        usage(option.error);
        break;
    }
  }

  config.paths = process.argv.slice(parser.optind());

  if (config.patterns.length == 0 && !config.matchScript) {
    if (config.paths.length > 0) {
      config.patterns.push(config.paths.shift());
    } else {
      console.error("At least one pattern must be specified.");
      usage(true);
    }
  }

  if (config.filename === null) {
    config.filename = config.paths.length > 1;
  }
})();

try {
  var patternsAst = [];
  for (var i = 0; i < config.patterns.length; i++) {
    patternsAst[i] = jsgrep.Matcher.compilePattern(config.patterns[i]);
  }
} catch(e) {
  console.error(e.name + ": " + e.message);
  process.exit(1);
}

if (config.dumpAst) {
  _.each(patternsAst, function(ast, i) {
    console.log("Pattern: " + config.patterns[i]);
    console.log(ast.toString());
  });
  process.exit(0);
}

function doFile(filename) {
  var fileHasMatch = false;
  var source = fs.readFileSync(filename).toString();
  // If the first character is a shebang, comment it out
  if (source.substr(0, 2) == '#!') {
    source = "// " + source;
  }

  var sourceLines = null;
  if (config.print == PRINT_FIRST_LINE) {
    sourceLines = source.split('\n');
  }

  try {
    var ast = Narcissus.parser.parse(source, filename, 1);
  } catch(e) {
    console.warn(e.name + ": " + e.message);
    return;
  }

  try {
    jsgrep.jsgrep({
      source: ast,
      patterns: patternsAst,
      matchScript: config.matchScript,
      strictMatches: config.strictMatches,
      callback: function(node, variables) {
        var output = false, lineNumber = node.lineno;

        fileHasMatch = true;

        if (config.print === PRINT_FIRST_LINE) {
          output = sourceLines[node.lineno - 1];
        } else if (config.print === PRINT_ONLY_MATCHING) {
          output = node.tokenizer.source.substring(node.start, node.end);
        } else if (config.print === PRINT_METAVAR) {
          if (!variables[config.printMetavar]) {
            console.error("jsgrep: Metavariable " + config.printMetavar +
                " is not bound to any expression.");
            process.exit(1);
          } else {
            var matchNode = variables[config.printMetavar];
            output = jsgrep.Matcher.getSourceForNode(matchNode);
            lineNumber = matchNode.lineno;
          }
        } else {
          // Print filenames, so bail the search for speed
          throw 'done';
        }
        if (output) {
          if (output.indexOf('\n') > 0) {
            output = output.substr(0, output.indexOf('\n'));
          }
          console.log((config.filename ? filename + ":" : "") +
                      (config.lineNumber ? lineNumber + ":" : "") +
                      output);
        }
      }
    });
  } catch(e) {
    if (e !== 'done') {
      console.error("jsgrep: " + e.stack);
      process.exit(1);
    }
  }

  if (config.print == PRINT_FILES_NOT_MATCHING && !fileHasMatch ||
      config.print == PRINT_FILES_MATCHING && fileHasMatch) {
    console.log(filename);
  }
}

function doDirectory(directory) {
  if (!config.recursive) {
    console.warn("jsgrep: ignoring directory without -r");
    return;
  }
  var files = fs.readdirSync(directory);
  for (var i = 0; i < files.length; i++) {
    var filePath = path.join(directory, files[i]);
    var stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      doDirectory(filePath);
    } else if (filePath.substr(-3) == ".js") {
      doFile(filePath);
    }
  }
}

for (var i = 0; i < config.paths.length; i++) {
  var stat = fs.statSync(config.paths[i]);
  if (stat.isDirectory()) {
    doDirectory(config.paths[i]);
  } else {
    doFile(config.paths[i]);
  }
}

// vim: ft=javascript
