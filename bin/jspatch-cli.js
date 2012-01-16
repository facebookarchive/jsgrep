#!/usr/bin/env node

var Narcissus = require('narcissus');
var _ = require('underscore');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var jsgrep = require('../lib/jsgrep.js');

var config = {
  paths: [ ],
  recursive: false,
  inPlace: false,
  patchFile: false,
  sedMode: false,
  asJavascript: false
};

function usage(hasError) {
  if (hasError) {
    console.log("See jspatch --help for usage information.");
    process.exit(hasError ? 1 : 0);
  }
  console.log("jspatch: JavaScript source code refactoring tool");
  console.log("");
  console.log("Usage: jspatch [OPTIONS] PATCHFILE FILES...");
  console.log("");
  console.log("Options:");
  console.log("  -f, --patch-script=FILE   Path to patch script.");
  console.log("  -J, --javascript          Interpret PATCHFILE as a match script.");
  console.log("  -e, --expression=SCRIPT   Sed mode. SCRIPT is in the form of s/A/B/");
  console.log("  -i, --in-place            Perform the modifications.");
  console.log("  -r, --recursive           Scan directories for JavaScript files.");
  console.log("  -V, --version             Show version information.");
  process.exit(0);
}

function version() {
  var package = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));
  console.log("jspatch " + package.version);
  process.exit(0);
}

(function parseArgs() {
  var getopt = require('posix-getopt');
  var parser = new getopt.BasicParser(
    'f:(match-script)J(javascript)e:(expression)i(in-place)r(recursive)' +
    'V(version)_(help)',
    process.argv);

  while ((option = parser.getopt()) !== undefined) {
    switch(option.option) {
      case 'f':
        config.patchFile = option.optarg;
        break;
      case 'J':
        config.asJavascript = true;
        break;
      case 'e':
        config.sedMode = option.optarg;
        break;
      case 'i':
        config.inPlace = true;
        break;
      case 'r':
        config.recursive = true;
        break;
      case 'V':
        version();
        break;
      case '?':
      case '_':
        usage(option.error);
        break;
    }
  }

  config.paths = process.argv.slice(parser.optind());

  if (!config.patchFile && !config.sedMode) {
    if (config.paths.length > 0) {
      config.patchFile = config.paths.shift();
    } else {
      console.error("jspatch: Must specify a patch file.");
      usage(true);
    }
  }
})();

var paths = config.paths;
var matchFn;

function processPatch(patchSource, patchFilename) {
  var lineNumber = 1;
  var chunks = _.map(patchSource.split('\n---\n'), function(chunkSource) {
    var lines = chunkSource.split('\n');
    var chunk = {
      find: [],
      patch: chunkSource,
      filename: patchFilename || "",
      lineNumber: lineNumber
    };

    for(var i = 0; i < lines.length; i++) {
      if (lines[i][0] == '-') {
        chunk.find.push(lines[i].substr(1));

      } else if (lines[i][0] == '+') {
        // So line numbers match up
        chunk.find.push('\n');

      } else {
        chunk.find.push(lines[i]);
      }
    }

    chunk.find = chunk.find.join('\n').trim();

    lineNumber += lines.length + 1;
    return chunk;
  });

  return function(ast) {
    _.each(chunks, function(chunk) {
      var matchOptions = {
        strictMatches: true,
        filename: chunk.filename,
        lineNumber: chunk.lineNumber
      };
      ast.findStrict(chunk.find, function(v) {
        v.node.applyPatch(chunk.patch, patchFilename, chunk.lineNumber);
      }, matchOptions);
    });
  };
}

function generateDiff(oldFilename, newFile, callback) {
  var tempFilename, tries = 1;
  do {
    tempFilename = path.join(process.env.TEMP || "/tmp",
      "jspatch." + path.basename(oldFilename, ".js") +
      (tries == 1 ? "" : ("." + tries)) + ".js");
    tries++;
  } while (path.existsSync(tempFilename));

  fs.writeFileSync(tempFilename, newFile);

  var child =
    child_process.spawn('diff', [ '-u', oldFilename, tempFilename ]);

  child.stdout.on('data', function(data) {
    process.stdout.write(data);
  });
  child.stderr.on('data', function(data) {
    process.stderr.write(data);
  });

  child.on('exit', function(code) {
    fs.unlinkSync(tempFilename);
    if (code !== 0 && code !== 1) {
      // diff returns 0 for no differences, 1 for differences, 2 for error
      console.error('jspatch: diff exited with code ' + code);
      process.exit(1);
    }
    callback();
  });
}

function doFile(filename, callback) {
  var source = fs.readFileSync(filename).toString();
  // If the first character is a shebang, comment it out
  if (source.substr(0, 2) == '#!') {
    source = "//" + source;
  }

  try {
    var ast = Narcissus.parser.parse(source, filename, 1);
  } catch(e) {
    console.warn(e.name + ": " + e.message);
    return callback();
  }

  var fileMatched = false;

  try {
    jsgrep.jsgrep({
      source: ast,
      matchScript: matchFn,
      callback: function(node, variables) {
        fileMatched = true;
      }
    });
  } catch(e) {
    if (!(e instanceof Error) && e.message) {
      console.error("jspatch: " + e.message);
      process.exit(1);
    }
    throw e;
  }

  if (!fileMatched) {
    return callback();
  }

  var modifiedSource = ast.tokenizer.source;
  var isValid = true;

  // Try to parse the modified source
  try {
    Narcissus.parser.parse(modifiedSource, 'modified source', 1);
  } catch(e) {
    isValid = false;

    console.error('jspatch: ' + filename +
      ': warning: modifications resulted in an invalid JavaScript file!');
    console.error('This is probably a bug in jspatch. ' +
      'Please let ry@fb.com know!');

    if (config.inPlace) {
      console.error('Not modifying ' + filename + ' due to error.');
    }
  }

  if (source.substr(0, 4) == '//#!') {
    // Now remove the comment from the shebang
    source = source.substr(2);
    modifiedSource = modifiedSource.substr(2);
  }

  if (isValid && config.inPlace) {
    fs.writeFileSync(filename, modifiedSource);
    return callback();
  } else {
    generateDiff(filename, modifiedSource, callback);
  }
}

function queueDirectory(directory) {
  if (!config.recursive) {
    return;
  }
  var files = fs.readdirSync(directory);
  for (var i = 0; i < files.length; i++) {
    var filePath = path.join(directory, files[i]);
    var stat = fs.statSync(filePath);
    if (stat.isDirectory() ||
        filePath.substr(-3) == ".js") {
      paths.push(filePath);
    }
  }
}

function jspatch_loop() {
  if (paths.length == 0) {
    return;
  }

  var nextPath = paths.shift();
  var stat = fs.statSync(nextPath);
  if (stat.isDirectory()) {
    queueDirectory(nextPath);
    return jspatch_loop();
  } else {
    doFile(nextPath, jspatch_loop);
  }
}

if (config.sedMode) {
  // XXX hurr hurr can't sed mode division, paths in string literals, blah blah
  var sedMode = config.sedMode.split('/');
  if (sedMode.length != 4 || sedMode[0] != 's' || sedMode[3] != '') {
    console.error('jspatch: Pattern for sed mode must be in the form of ' +
      '"s/search/replace/".');
    process.exit(1);
  }
  matchFn = processPatch('-' + sedMode[1] + '\n+' + sedMode[2], 'sed mode');
} else if (config.asJavascript) {
  matchFn = config.patchFile;
} else {
  var patchSource = fs.readFileSync(config.patchFile).toString();
  matchFn = processPatch(patchSource, config.patchFile);
}

jspatch_loop();

// vim: ft=javascript
